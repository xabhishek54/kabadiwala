import random
import string
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.models.material import Material
from app.models.traceability import TraceabilityEvent
from app.models.price import PriceObservation
from app.models.collector import Collector
from app.models.enums import TransactionStatus, EventActor, PaymentStatus, ObservationSource, ObservationUnit, PriceChannel
from app.schemas.transaction import TransactionResponse
from app.schemas.traceability import TraceabilityEventResponse
from app.auth import require_auth

from pydantic import BaseModel

router = APIRouter(prefix="/handovers", tags=["handovers"], dependencies=[Depends(require_auth)])

class HandoverConfirmPayload(BaseModel):
    lot_id: str
    recycler_id: str
    short_code: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    final_sale_value: Optional[float] = None
    notes: Optional[str] = None

def generate_short_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

@router.get("/{lot_id}/qr-token")
def get_handover_qr_token(lot_id: str, db: Session = Depends(get_db), principal: dict = Depends(require_auth)):
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if tx and principal.get("role") == "collector" and tx.collector_id != principal["sub"]:
        raise HTTPException(status_code=403, detail="Lot belongs to another collector")
    if tx and principal.get("role") == "recycler" and tx.recycler_id and tx.recycler_id != principal["sub"]:
        raise HTTPException(status_code=403, detail="Lot is assigned to another recycler")

    existing_event = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == lot_id,
        TraceabilityEvent.handover_reference_no.isnot(None)
    ).order_by(TraceabilityEvent.timestamp.desc()).first()

    if existing_event and existing_event.handover_reference_no:
        short_code = existing_event.handover_reference_no
    else:
        short_code = generate_short_code()
        # Log token generation event
        event = TraceabilityEvent(
            lot_id=lot_id,
            event_type=tx.status if tx else TransactionStatus.draft,
            actor=EventActor.collector,
            handover_reference_no=short_code,
            notes="Generated handover token QR and short code",
        )
        db.add(event)
        db.commit()

    return {
        "lot_id": lot_id,
        "handover_token": f"KC-{lot_id[:8] if lot_id else '00000000'}-{short_code}",
        "short_code": short_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.post("/confirm", response_model=TransactionResponse)
def confirm_handover(
    payload: HandoverConfirmPayload,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_auth),
):
    if principal.get("role") != "recycler":
        raise HTTPException(status_code=403, detail="Only a recycler can confirm handover")
    tx = db.query(Transaction).filter(Transaction.lot_id == payload.lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.recycler_id and tx.recycler_id != principal["sub"]:
        raise HTTPException(status_code=403, detail="Lot is assigned to another recycler")

    material = db.query(Material).filter(Material.lot_id == payload.lot_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material lot not found")

    if not payload.short_code:
        raise HTTPException(status_code=400, detail="Handover code is required")

    latest_token = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == payload.lot_id,
        TraceabilityEvent.handover_reference_no.isnot(None),
    ).order_by(TraceabilityEvent.timestamp.desc()).first()
    if not latest_token or payload.short_code.strip() != latest_token.handover_reference_no:
        raise HTTPException(status_code=400, detail="Invalid handover code")

    tx.recycler_id = payload.recycler_id
    tx.status = TransactionStatus.confirmed
    if payload.final_sale_value is not None:
        tx.final_sale_value = payload.final_sale_value
        tx.payment_status = PaymentStatus.paid
    else:
        tx.final_sale_value = tx.quoted_price

    tx.handover_lat = payload.gps_lat
    tx.handover_lng = payload.gps_lng

    # ── Auto-record price observation from this real transaction ──────────────
    # This converts every confirmed sale into live, district-specific price data
    actual_value = payload.final_sale_value or tx.quoted_price
    if actual_value and material.approx_weight_kg and material.approx_weight_kg > 0:
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

    # Add confirmation event
    event = TraceabilityEvent(
        lot_id=payload.lot_id,
        event_type=TransactionStatus.confirmed,
        actor=EventActor.recycler,
        gps_lat=payload.gps_lat,
        gps_lng=payload.gps_lng,
        handover_reference_no=payload.short_code,
        recycler_confirmation=True,
        notes=payload.notes or "Recycler confirmed lot handover",
    )
    db.add(event)

    db.commit()
    db.refresh(tx)
    return tx
