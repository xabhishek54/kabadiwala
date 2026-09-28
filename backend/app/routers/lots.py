from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.enums import TransactionStatus, EventActor
from app.schemas.material import MaterialCreate, MaterialResponse
from app.schemas.transaction import TransactionResponse

router = APIRouter(prefix="/lots", tags=["lots"])

# Valid state machine transitions per 03-technical-architecture.md §4
VALID_TRANSITIONS = {
    TransactionStatus.draft: [TransactionStatus.quoted, TransactionStatus.draft, TransactionStatus.matched],
    TransactionStatus.quoted: [TransactionStatus.matched, TransactionStatus.draft],
    TransactionStatus.matched: [TransactionStatus.handed_over, TransactionStatus.draft],
    TransactionStatus.handed_over: [TransactionStatus.confirmed],
    TransactionStatus.confirmed: [TransactionStatus.paid],
    TransactionStatus.paid: [TransactionStatus.closed],
    TransactionStatus.closed: [],
}

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_lot(payload: MaterialCreate, db: Session = Depends(get_db)):
    # Check if lot already exists
    existing = db.query(Material).filter(Material.lot_id == payload.lot_id).first() if payload.lot_id else None
    if existing:
        return existing

    material_data = payload.dict(exclude_unset=True)
    material = Material(**material_data)
    db.add(material)

    # Initialize transaction record in draft state
    tx = Transaction(
        lot_id=material.lot_id,
        collector_id=material.collector_id,
        status=TransactionStatus.draft,
        quoted_price=material.estimated_value,
    )
    db.add(tx)

    # Record initial traceability event
    event = TraceabilityEvent(
        lot_id=material.lot_id,
        event_type=TransactionStatus.draft,
        actor=EventActor.collector,
        notes="Lot created in draft state",
    )
    db.add(event)

    db.commit()
    db.refresh(material)
    return material

@router.get("/{lot_id}", response_model=MaterialResponse)
def get_lot(lot_id: str, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.lot_id == lot_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Lot not found")
    return material

@router.get("", response_model=List[MaterialResponse])
def list_lots(collector_id: Optional[str] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Material)
    if collector_id:
        query = query.filter(Material.collector_id == collector_id)
    return query.order_by(Material.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/{lot_id}/transition", response_model=TransactionResponse)
def transition_lot_state(
    lot_id: str,
    target_status: TransactionStatus,
    actor: EventActor = EventActor.collector,
    recycler_id: Optional[str] = None,
    final_sale_value: Optional[float] = None,
    gps_lat: Optional[float] = None,
    gps_lng: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction for lot not found")

    allowed = VALID_TRANSITIONS.get(tx.status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {tx.status.value} to {target_status.value}",
        )

    tx.status = target_status
    if recycler_id:
        tx.recycler_id = recycler_id
    if final_sale_value is not None:
        tx.final_sale_value = final_sale_value

    event = TraceabilityEvent(
        lot_id=lot_id,
        event_type=target_status,
        actor=actor,
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        notes=notes or f"State transitioned to {target_status.value}",
    )
    db.add(event)

    db.commit()
    db.refresh(tx)
    return tx


@router.get("/{lot_id}/events", tags=["traceability"])
def get_lot_traceability_events(lot_id: str, db: Session = Depends(get_db)):
    """Return the full chain-of-custody audit trail for a lot — every event in chronological order."""
    material = db.query(Material).filter(Material.lot_id == lot_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Lot not found")

    events = (
        db.query(TraceabilityEvent)
        .filter(TraceabilityEvent.lot_id == lot_id)
        .order_by(TraceabilityEvent.timestamp.asc())
        .all()
    )

    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()

    from app.models.recycler import Recycler
    recycler = db.query(Recycler).filter(Recycler.recycler_id == tx.recycler_id).first() if tx and tx.recycler_id else None

    return {
        "lot_id": lot_id,
        "material_category": material.material_category.value,
        "sub_category": material.sub_category,
        "description": material.description,
        "image_ref": material.image_ref,
        "approx_weight_kg": material.approx_weight_kg,
        "current_status": tx.status.value if tx else "unknown",
        "recycler_name": recycler.name if recycler else None,
        "recycler_auth_ref": recycler.authorization_ref_no if recycler else None,
        "events": [
            {
                "event_id": e.event_id,
                "event_type": e.event_type.value,
                "actor": e.actor.value,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "gps_lat": e.gps_lat,
                "gps_lng": e.gps_lng,
                "photo_ref": e.photo_ref,
                "handover_reference_no": e.handover_reference_no,
                "recycler_confirmation": e.recycler_confirmation,
                "notes": e.notes,
            }
            for e in events
        ],
    }
