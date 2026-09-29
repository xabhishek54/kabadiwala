from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.recycler import Recycler
from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.enums import AuthorizationStatus, EventActor, MaterialCategory, TransactionStatus, PaymentStatus
from app.services.anomaly_detector import detect_transaction_anomalies
from app.services.lot_lifecycle import VALID_TRANSITIONS

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/recyclers/pending", response_model=List[dict])
def list_pending_recyclers(db: Session = Depends(get_db)):
    recyclers = db.query(Recycler).filter(Recycler.authorization_status == AuthorizationStatus.pending).all()
    return [
        {
            "recycler_id": r.recycler_id,
            "name": r.name,
            "authorization_ref_no": r.authorization_ref_no,
            "contact_phone": r.contact_phone,
            "materials_accepted": r.materials_accepted,
            "created_at": r.created_at.isoformat(),
        }
        for r in recyclers
    ]

@router.get("/lots", response_model=List[dict])
def list_admin_lots(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Material).outerjoin(Transaction, Material.lot_id == Transaction.lot_id)

    if category:
        try:
            cat_enum = MaterialCategory(category)
            query = query.filter(Material.material_category == cat_enum)
        except ValueError:
            pass

    if status_filter:
        try:
            st_enum = TransactionStatus(status_filter)
            query = query.filter(Transaction.status == st_enum)
        except ValueError:
            pass

    materials = query.order_by(Material.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for m in materials:
        tx = m.transaction[0] if (m.transaction and len(m.transaction) > 0) else (m.transaction if hasattr(m.transaction, 'status') else None)
        results.append({
            "lot_id": m.lot_id,
            "category": m.material_category.value,
            "sub_category": m.sub_category,
            "weight_kg": m.approx_weight_kg,
            "condition": m.condition.value,
            "estimated_value": m.estimated_value,
            "image_ref": m.image_ref,
            "collector_id": m.collector_id,
            "status": tx.status.value if tx else "draft",
            "final_sale_value": tx.final_sale_value if tx else None,
            "payment_status": tx.payment_status.value if tx else "unpaid",
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return results

@router.patch("/lots/{lot_id}/status")
def update_lot_status(
    lot_id: str,
    status: str,
    final_sale_value: Optional[float] = None,
    db: Session = Depends(get_db)
):
    try:
        new_status = TransactionStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status '{status}'")

    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if new_status not in VALID_TRANSITIONS[tx.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Invalid transition from {tx.status.value} to {new_status.value}",
        )
    if final_sale_value is not None and final_sale_value <= 0:
        raise HTTPException(status_code=400, detail="Final sale value must be positive")
    if new_status == TransactionStatus.paid and not (final_sale_value or tx.final_sale_value):
        raise HTTPException(status_code=400, detail="A final sale value is required before marking the lot paid")

    tx.status = new_status

    if final_sale_value is not None:
        tx.final_sale_value = final_sale_value

    if new_status == TransactionStatus.paid:
        tx.payment_status = PaymentStatus.paid

    db.add(TraceabilityEvent(
        lot_id=lot_id,
        event_type=new_status,
        actor=EventActor.admin,
        notes=f"Admin transitioned lot to {new_status.value}",
    ))
    db.commit()
    return {"message": "Status updated successfully", "lot_id": lot_id, "status": tx.status.value}

@router.get("/anomalies", response_model=List[dict])
def get_flagged_anomalies(
    district: str = "Pune",
    category: Optional[str] = None,
    z_threshold: float = 3.5,
    db: Session = Depends(get_db)
):
    """Returns price and condition anomalies detected by MAD algorithm."""
    return detect_transaction_anomalies(db=db, district=district, category=category, z_threshold=z_threshold)

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_lots = db.query(func.count(Material.lot_id)).scalar() or 0
    total_weight_kg = db.query(func.sum(Material.approx_weight_kg)).scalar() or 0.0
    total_payouts = db.query(func.sum(Transaction.final_sale_value)).filter(Transaction.payment_status == PaymentStatus.paid).scalar() or 0.0
    total_recyclers = db.query(func.count(Recycler.recycler_id)).filter(Recycler.authorization_status == AuthorizationStatus.verified).scalar() or 0

    category_counts = db.query(
        Material.material_category,
        func.count(Material.lot_id),
        func.sum(Material.approx_weight_kg)
    ).group_by(Material.material_category).all()

    by_category = [
        {
            "category": cat.value,
            "count": count,
            "weight_kg": round(weight or 0.0, 2)
        }
        for cat, count, weight in category_counts
    ]

    return {
        "total_lots": total_lots,
        "total_weight_kg": round(total_weight_kg, 2),
        "total_payouts_inr": round(total_payouts, 2),
        "verified_recyclers_count": total_recyclers,
        "category_breakdown": by_category,
    }


@router.patch("/anomalies/{lot_id}/resolve")
def resolve_flagged_anomaly(lot_id: str, db: Session = Depends(get_db)):
    """Mark an anomaly audit flag as resolved by admin."""
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    existing_resolution = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == lot_id,
        TraceabilityEvent.actor == EventActor.admin,
        TraceabilityEvent.notes == "Anomaly review resolved",
    ).first()
    if not existing_resolution:
        db.add(TraceabilityEvent(
            lot_id=lot_id,
            event_type=tx.status,
            actor=EventActor.admin,
            notes="Anomaly review resolved",
        ))
        db.commit()
    return {
        "status": "resolved",
        "lot_id": lot_id,
        "message": f"Anomaly flag for lot {lot_id} marked as resolved.",
    }


@router.get("/minerals/impact")
def get_critical_minerals_impact(district: str = "Pune", db: Session = Depends(get_db)):
    """
    Returns estimated critical minerals recovery totals based on processed e-waste volume.
    Translates raw e-waste tonnage into strategic mineral values (Li, Co, Nd, Ta, Ga, In, Cu).
    """
    weight_query = db.query(func.sum(Material.approx_weight_kg)).join(
        Transaction, Transaction.lot_id == Material.lot_id
    ).join(
        Collector, Collector.collector_id == Transaction.collector_id
    ).filter(
        Transaction.status.in_([TransactionStatus.paid, TransactionStatus.closed]),
        Transaction.payment_status == PaymentStatus.paid,
        Transaction.final_sale_value.isnot(None),
    )
    if district.strip():
        weight_query = weight_query.filter(Collector.operating_locality.ilike(f"%{district.strip()}%"))
    total_weight = weight_query.scalar() or 0.0

    # Convert kg to mineral gram estimates
    copper_g = round(total_weight * 200.0, 1)    # 200g Cu / kg e-waste
    lithium_g = round(total_weight * 15.0, 1)    # 15g Li / kg
    cobalt_g = round(total_weight * 45.0, 1)     # 45g Co / kg
    neodymium_g = round(total_weight * 30.0, 1)  # 30g Nd / kg
    tantalum_g = round(total_weight * 0.15, 1)   # 0.15g Ta / kg
    gallium_g = round(total_weight * 0.05, 1)    # 0.05g Ga / kg
    indium_g = round(total_weight * 0.02, 1)     # 0.02g In / kg

    return {
        "unit": "grams",
        "district": district,
        "total_e_waste_processed_kg": round(float(total_weight), 2),
        "estimate_basis": "Theoretical material-composition factors; not measured recovery.",
        "mineral_estimates": {
            "copper": copper_g,
            "lithium": lithium_g,
            "cobalt": cobalt_g,
            "neodymium": neodymium_g,
            "tantalum": tantalum_g,
            "gallium": gallium_g,
            "indium": indium_g,
        },
    }
