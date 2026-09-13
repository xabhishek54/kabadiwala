import random
import string
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.enums import TransactionStatus, EventActor, PaymentStatus
from app.schemas.transaction import TransactionResponse
from app.schemas.traceability import TraceabilityEventResponse

router = APIRouter(prefix="/handovers", tags=["handovers"])

def generate_short_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

@router.get("/{lot_id}/qr-token")
def get_handover_qr_token(lot_id: str, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    short_code = generate_short_code()

    # Log token generation event
    event = TraceabilityEvent(
        lot_id=lot_id,
        event_type=tx.status,
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
    lot_id: str,
    recycler_id: str,
    short_code: Optional[str] = None,
    gps_lat: Optional[float] = None,
    gps_lng: Optional[float] = None,
    final_sale_value: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx.recycler_id = recycler_id
    tx.status = TransactionStatus.confirmed
    if final_sale_value is not None:
        tx.final_sale_value = final_sale_value
        tx.payment_status = PaymentStatus.paid
    else:
        tx.final_sale_value = tx.quoted_price

    tx.handover_lat = gps_lat
    tx.handover_lng = gps_lng

    # Add confirmation event
    event = TraceabilityEvent(
        lot_id=lot_id,
        event_type=TransactionStatus.confirmed,
        actor=EventActor.recycler,
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        handover_reference_no=short_code,
        recycler_confirmation=True,
        notes=notes or "Recycler confirmed lot handover",
    )
    db.add(event)

    db.commit()
    db.refresh(tx)
    return tx
