import secrets
import string
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.price import PriceObservation
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.enums import (
    AuthorizationStatus,
    EventActor,
    ObservationSource,
    ObservationUnit,
    PaymentMethod,
    PaymentStatus,
    PriceChannel,
    TransactionStatus,
)
from app.schemas.transaction import TransactionResponse
from app.schemas.traceability import TraceabilityEventResponse

from pydantic import BaseModel
from pydantic import Field

router = APIRouter(prefix="/handovers", tags=["handovers"])

class HandoverConfirmPayload(BaseModel):
    lot_id: str
    recycler_id: str
    short_code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    final_sale_value: Optional[float] = Field(default=None, gt=0)
    payment_method: PaymentMethod = PaymentMethod.cash
    notes: Optional[str] = None

def generate_short_code(length: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))

@router.get("/{lot_id}/qr-token")
def get_handover_qr_token(lot_id: str, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.status not in (TransactionStatus.matched, TransactionStatus.handed_over):
        raise HTTPException(status_code=409, detail="Lot must be matched with a recycler before handover")

    existing_token = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == lot_id,
        TraceabilityEvent.handover_reference_no.isnot(None),
        TraceabilityEvent.notes == "Generated handover token QR and short code",
    ).order_by(desc(TraceabilityEvent.timestamp)).first()
    if existing_token:
        short_code = existing_token.handover_reference_no
        return {
            "lot_id": lot_id,
            "handover_token": f"KC-{lot_id[:8]}-{short_code}",
            "short_code": short_code,
            "timestamp": existing_token.timestamp.isoformat() if existing_token.timestamp else None,
        }

    short_code = generate_short_code()

    # Log token generation event
    event = TraceabilityEvent(
        lot_id=lot_id,
        event_type=TransactionStatus.matched,
        actor=EventActor.collector,
        handover_reference_no=short_code,
        notes="Generated handover token QR and short code",
    )
    db.add(event)
    db.commit()

    return {
        "lot_id": lot_id,
        "handover_token": f"KC-{lot_id[:8]}-{short_code}",
        "short_code": short_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.post("/confirm", response_model=TransactionResponse)
def confirm_handover(
    payload: HandoverConfirmPayload,
    db: Session = Depends(get_db),
):
    tx = db.query(Transaction).filter(Transaction.lot_id == payload.lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.status not in (TransactionStatus.matched, TransactionStatus.handed_over):
        raise HTTPException(status_code=409, detail="Lot is not ready for handover confirmation")
    if tx.recycler_id != payload.recycler_id:
        raise HTTPException(status_code=400, detail="Recycler does not match the selected buyer")

    recycler = db.query(Recycler).filter(Recycler.recycler_id == payload.recycler_id).first()
    if not recycler or recycler.authorization_status != AuthorizationStatus.verified:
        raise HTTPException(status_code=403, detail="Only a verified recycler can confirm this handover")
    accepted_categories = set(recycler.materials_accepted or [])
    if (
        tx.material.material_category.value not in accepted_categories
        and tx.material.material_category.value not in (recycler.offered_rates or {})
    ):
        raise HTTPException(status_code=400, detail="Recycler does not accept this material category")

    matching_code = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == payload.lot_id,
        TraceabilityEvent.handover_reference_no == payload.short_code,
        TraceabilityEvent.notes == "Generated handover token QR and short code",
    ).first()
    if not matching_code:
        raise HTTPException(status_code=400, detail="Handover code is invalid or expired")

    final_value = payload.final_sale_value or tx.quoted_price
    if final_value is None or final_value <= 0:
        raise HTTPException(status_code=400, detail="A positive final sale value is required")

    if tx.status == TransactionStatus.matched:
        db.add(TraceabilityEvent(
            lot_id=payload.lot_id,
            event_type=TransactionStatus.handed_over,
            actor=EventActor.collector,
            gps_lat=payload.gps_lat,
            gps_lng=payload.gps_lng,
            handover_reference_no=payload.short_code,
            notes="Material handed over to selected recycler",
        ))
        tx.status = TransactionStatus.handed_over

    tx.recycler_id = payload.recycler_id
    tx.final_sale_value = final_value
    tx.handover_lat = payload.gps_lat
    tx.handover_lng = payload.gps_lng

    tx.status = TransactionStatus.confirmed
    db.add(TraceabilityEvent(
        lot_id=payload.lot_id,
        event_type=TransactionStatus.confirmed,
        actor=EventActor.recycler,
        gps_lat=payload.gps_lat,
        gps_lng=payload.gps_lng,
        handover_reference_no=payload.short_code,
        recycler_confirmation=True,
        notes=payload.notes or "Recycler confirmed lot handover",
    ))

    tx.payment_method = payload.payment_method
    tx.payment_status = PaymentStatus.paid
    tx.status = TransactionStatus.paid
    db.add(TraceabilityEvent(
        lot_id=payload.lot_id,
        event_type=TransactionStatus.paid,
        actor=EventActor.recycler,
        handover_reference_no=payload.short_code,
        recycler_confirmation=True,
        notes=f"Payment recorded by {payload.payment_method.value}",
    ))
    tx.status = TransactionStatus.closed
    db.add(TraceabilityEvent(
        lot_id=payload.lot_id,
        event_type=TransactionStatus.closed,
        actor=EventActor.system,
        handover_reference_no=payload.short_code,
        recycler_confirmation=True,
        notes="Handover and payment completed",
    ))

    tx.handover_lat = payload.gps_lat
    tx.handover_lng = payload.gps_lng

    # ── Auto-record price observation from this real transaction ──────────────
    # This converts every confirmed sale into live, district-specific price data
    actual_value = final_value
    material = tx.material
    if actual_value and material.approx_weight_kg > 0:
        price_per_kg = actual_value / material.approx_weight_kg
        # Resolve the collector's district for location tagging
        collector = db.query(Collector).filter(
            Collector.collector_id == tx.collector_id
        ).first()
        district = (collector.operating_locality or "Pune") if collector else "Pune"

        obs = PriceObservation(
            material_category=material.material_category,
            sub_category=material.sub_category or material.material_category.value,
            location_district=district,
            buying_price=round(price_per_kg, 2),
            quoted_price=round(price_per_kg, 2),
            unit=ObservationUnit.per_kg,
            source=ObservationSource.transaction_derived,
            channel=PriceChannel.formal,
            recycler_id=payload.recycler_id,
        )
        db.add(obs)
    # ─────────────────────────────────────────────────────────────────────────

    db.commit()
    db.refresh(tx)
    return tx
