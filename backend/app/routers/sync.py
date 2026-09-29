import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.price import PriceObservation
from app.models.recycler import Recycler
from app.models.enums import (
    AuthorizationStatus,
    EventActor,
    MaterialCategory,
    MaterialCondition,
    MaterialSource,
    ObservationSource,
    ObservationUnit,
    PaymentMethod,
    PaymentStatus,
    PriceChannel,
    TransactionStatus,
)
from app.schemas.sync import SyncPushRequest, SyncPushResponse, SyncPushResponseItem, SyncPullResponse
from app.services.lot_lifecycle import VALID_TRANSITIONS

router = APIRouter(prefix="/sync", tags=["sync"])
logger = logging.getLogger(__name__)

@router.post("/push", response_model=SyncPushResponse)
def sync_push(payload: SyncPushRequest, db: Session = Depends(get_db)):
    results = []
    processed_count = 0

    for item in payload.items:
        try:
            with db.begin_nested():
                entity_type = item.entity_type
                p = item.payload

                if entity_type == "material":
                    lot_id = item.client_uuid
                    if p.get("lot_id", lot_id) != lot_id:
                        raise ValueError("Lot ID does not match the client UUID")

                    collector = db.query(Collector).filter(
                        Collector.collector_id == payload.collector_id
                    ).first()
                    if not collector:
                        raise ValueError("Collector account not found")

                    existing = db.query(Material).filter(Material.lot_id == lot_id).first()
                    if existing and existing.collector_id != payload.collector_id:
                        raise ValueError("Lot belongs to another collector")
                    if not existing:
                        category = MaterialCategory(p["material_category"])
                        condition = MaterialCondition(p.get("condition", "intact"))
                        source_type = MaterialSource(p.get("source_type", "household"))
                        weight = float(p["approx_weight_kg"])
                        estimated_value = float(p["estimated_value"])
                        if weight <= 0 or weight > 500 or estimated_value < 0:
                            raise ValueError("Weight or estimated value is outside the allowed range")

                        material = Material(
                            lot_id=lot_id,
                            material_category=category,
                            sub_category=p.get("sub_category") or category.value,
                            description=p.get("description"),
                            image_ref=p.get("image_ref"),
                            approx_weight_kg=weight,
                            condition=condition,
                            condition_confidence=p.get("condition_confidence"),
                            condition_ml_used=bool(p.get("condition_ml_used", False)),
                            source_type=source_type,
                            estimated_value=estimated_value,
                            collector_id=payload.collector_id,
                            classifier_confidence=p.get("classifier_confidence"),
                            classifier_used=bool(p.get("classifier_used", False)),
                        )
                        db.add(material)
                        db.flush()

                        db.add(Transaction(
                            lot_id=lot_id,
                            collector_id=payload.collector_id,
                            status=TransactionStatus.quoted,
                            quoted_price=estimated_value,
                        ))
                        db.add_all([
                            TraceabilityEvent(
                                lot_id=lot_id,
                                event_type=TransactionStatus.draft,
                                actor=EventActor.collector,
                                notes="Lot created offline",
                            ),
                            TraceabilityEvent(
                                lot_id=lot_id,
                                event_type=TransactionStatus.quoted,
                                actor=EventActor.collector,
                                notes="Estimate accepted",
                            ),
                        ])

                elif entity_type == "transaction":
                    lot_id = p.get("lot_id", item.client_uuid)
                    if lot_id != item.client_uuid:
                        raise ValueError("Lot ID does not match the client UUID")
                    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
                    if not tx:
                        raise ValueError("Transaction not found for this lot")
                    if tx.collector_id != payload.collector_id:
                        raise ValueError("Transaction does not belong to this collector")

                    target_status = TransactionStatus(p.get("status", tx.status.value))
                    recycler_id = p.get("recycler_id", tx.recycler_id)
                    recycler = None
                    if recycler_id is not None:
                        recycler = db.query(Recycler).filter(
                            Recycler.recycler_id == recycler_id
                        ).first()
                        if not recycler or recycler.authorization_status != AuthorizationStatus.verified:
                            raise ValueError("Only a verified recycler can be selected")
                    if target_status == TransactionStatus.matched and recycler is None:
                        raise ValueError("A verified recycler must be selected before matching")

                    if target_status != tx.status:
                        if target_status not in VALID_TRANSITIONS[tx.status]:
                            raise ValueError(
                                f"Invalid transition from {tx.status.value} to {target_status.value}"
                            )
                        tx.status = target_status
                        db.add(TraceabilityEvent(
                            lot_id=lot_id,
                            event_type=target_status,
                            actor=EventActor.collector,
                            notes=f"Status synchronized to {target_status.value}",
                        ))

                    if recycler_id is not None:
                        tx.recycler_id = recycler_id
                    if p.get("quoted_price") is not None:
                        tx.quoted_price = float(p["quoted_price"])
                    if p.get("final_sale_value") is not None:
                        final_value = float(p["final_sale_value"])
                        if final_value < 0:
                            raise ValueError("Final sale value cannot be negative")
                        tx.final_sale_value = final_value
                    if p.get("payment_method") is not None:
                        tx.payment_method = PaymentMethod(p["payment_method"])
                    if p.get("payment_status") is not None:
                        payment_status = PaymentStatus(p["payment_status"])
                        if payment_status == PaymentStatus.paid and target_status not in (
                            TransactionStatus.paid,
                            TransactionStatus.closed,
                        ):
                            raise ValueError("Payment cannot be marked paid before the paid state")
                        tx.payment_status = payment_status
                    if target_status in (TransactionStatus.paid, TransactionStatus.closed):
                        if tx.payment_status != PaymentStatus.paid:
                            raise ValueError("A transaction must be paid before it can be closed")
                    tx.updated_at = datetime.now(timezone.utc)

                elif entity_type == "traceability_event":
                    event_id = item.client_uuid
                    if not db.query(TraceabilityEvent).filter(
                        TraceabilityEvent.event_id == event_id
                    ).first():
                        lot_id = p.get("lot_id")
                        if not db.query(Material).filter(Material.lot_id == lot_id).first():
                            raise ValueError("Traceability event references an unknown lot")
                        db.add(TraceabilityEvent(
                            event_id=event_id,
                            lot_id=lot_id,
                            event_type=TransactionStatus(p["event_type"]),
                            actor=EventActor(p.get("actor", "collector")),
                            gps_lat=p.get("gps_lat"),
                            gps_lng=p.get("gps_lng"),
                            photo_ref=p.get("photo_ref"),
                            handover_reference_no=p.get("handover_reference_no"),
                            recycler_confirmation=bool(p.get("recycler_confirmation", False)),
                            notes=p.get("notes"),
                        ))

                elif entity_type == "price_observation":
                    observation_id = item.client_uuid
                    if not db.query(PriceObservation).filter(
                        PriceObservation.observation_id == observation_id
                    ).first():
                        category = MaterialCategory(p["material_category"])
                        buying_price = float(p["buying_price"])
                        if buying_price <= 0:
                            raise ValueError("Price must be greater than zero")
                        db.add(PriceObservation(
                            observation_id=observation_id,
                            material_category=category,
                            sub_category=p.get("sub_category") or category.value,
                            location_district=p.get("location_district") or "Unknown",
                            buying_price=buying_price,
                            quoted_price=p.get("quoted_price"),
                            unit=ObservationUnit(p.get("unit", "per_kg")),
                            source=ObservationSource(p.get("source", "collector_field_report")),
                            channel=PriceChannel(p.get("channel", "informal")),
                        ))
                else:
                    raise ValueError(f"Unsupported entity type: {entity_type}")

            results.append(SyncPushResponseItem(client_uuid=item.client_uuid, status="synced"))
            processed_count += 1
        except Exception as e:
            logger.warning("Sync item %s rejected: %s", item.client_uuid, e)
            results.append(SyncPushResponseItem(client_uuid=item.client_uuid, status="rejected", error=str(e)))

    db.commit()
    return SyncPushResponse(processed=processed_count, results=results)

@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(district: str = "Pune", since: str | None = None, db: Session = Depends(get_db)):
    recyclers = db.query(Recycler).filter(Recycler.authorization_status == AuthorizationStatus.verified).all()
    prices = db.query(PriceObservation).filter(PriceObservation.location_district == district).all()

    recycler_dicts = [
        {
            "recycler_id": r.recycler_id,
            "name": r.name,
            "facility_lat": r.facility_lat,
            "facility_lng": r.facility_lng,
            "service_radius_km": r.service_radius_km,
            "materials_accepted": r.materials_accepted,
            "offered_rates": r.offered_rates,
            "pickup_available": r.pickup_available,
        }
        for r in recyclers
    ]

    price_dicts = [
        {
            "observation_id": p.observation_id,
            "material_category": p.material_category.value,
            "sub_category": p.sub_category,
            "buying_price": p.buying_price,
            "channel": p.channel.value,
            "observed_at": p.observed_at.isoformat(),
        }
        for p in prices
    ]

    return SyncPullResponse(
        server_timestamp=datetime.now(timezone.utc).isoformat(),
        prices=price_dicts,
        recyclers=recycler_dicts,
    )
