from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.price import PriceObservation
from app.models.recycler import Recycler
from app.models.enums import TransactionStatus, AuthorizationStatus
from app.schemas.sync import SyncPushRequest, SyncPushResponse, SyncPushResponseItem, SyncPullResponse

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/push", response_model=SyncPushResponse)
def sync_push(payload: SyncPushRequest, db: Session = Depends(get_db)):
    results = []
    processed_count = 0

    for item in payload.items:
        try:
            entity_type = item.entity_type
            p = item.payload

            if entity_type == "material":
                lot_id = item.client_uuid
                existing = db.query(Material).filter(Material.lot_id == lot_id).first()
                if not existing:
                    mat = Material(
                        lot_id=lot_id,
                        material_category=p.get("material_category"),
                        sub_category=p.get("sub_category", "general"),
                        description=p.get("description"),
                        image_ref=p.get("image_ref"),
                        approx_weight_kg=float(p.get("approx_weight_kg", 1.0)),
                        condition=p.get("condition", "intact"),
                        condition_confidence=p.get("condition_confidence"),
                        condition_ml_used=p.get("condition_ml_used", False),
                        source_type=p.get("source_type", "household"),
                        estimated_value=float(p.get("estimated_value", 0.0)),
                        collector_id=payload.collector_id,
                        classifier_confidence=p.get("classifier_confidence"),
                        classifier_used=p.get("classifier_used", False),
                    )
                    db.add(mat)

                    # Also create baseline draft transaction if not present
                    tx_exist = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
                    if not tx_exist:
                        tx = Transaction(
                            lot_id=lot_id,
                            collector_id=payload.collector_id,
                            status=TransactionStatus.draft,
                            quoted_price=float(p.get("estimated_value", 0.0)),
                        )
                        db.add(tx)

                results.append(SyncPushResponseItem(client_uuid=lot_id, status="synced"))
                processed_count += 1

            elif entity_type == "transaction":
                lot_id = item.client_uuid
                tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
                if tx:
                    tx.status = p.get("status", tx.status)
                    tx.recycler_id = p.get("recycler_id", tx.recycler_id)
                    tx.final_sale_value = p.get("final_sale_value", tx.final_sale_value)
                    tx.payment_method = p.get("payment_method", tx.payment_method)
                    tx.payment_status = p.get("payment_status", tx.payment_status)

                results.append(SyncPushResponseItem(client_uuid=lot_id, status="synced"))
                processed_count += 1

            elif entity_type == "traceability_event":
                event_id = item.client_uuid
                existing = db.query(TraceabilityEvent).filter(TraceabilityEvent.event_id == event_id).first()
                if not existing:
                    evt = TraceabilityEvent(
                        event_id=event_id,
                        lot_id=p.get("lot_id"),
                        event_type=p.get("event_type", "draft"),
                        actor=p.get("actor", "collector"),
                        gps_lat=p.get("gps_lat"),
                        gps_lng=p.get("gps_lng"),
                        photo_ref=p.get("photo_ref"),
                        handover_reference_no=p.get("handover_reference_no"),
                        recycler_confirmation=p.get("recycler_confirmation", False),
                        notes=p.get("notes"),
                    )
                    db.add(evt)

                results.append(SyncPushResponseItem(client_uuid=event_id, status="synced"))
                processed_count += 1

            else:
                results.append(SyncPushResponseItem(client_uuid=item.client_uuid, status="synced"))
                processed_count += 1

        except Exception as e:
            results.append(SyncPushResponseItem(client_uuid=item.client_uuid, status="rejected", error=str(e)))

    db.commit()
    return SyncPushResponse(processed=processed_count, results=results)

@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(district: str = "Pune", since: Optional[str] = None, db: Session = Depends(get_db)):
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
