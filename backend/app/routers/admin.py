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
from app.auth import require_roles

# Valid lot state-machine transitions (mirrors lots.py)
VALID_TRANSITIONS = {
    TransactionStatus.draft: [TransactionStatus.quoted, TransactionStatus.draft],
    TransactionStatus.quoted: [TransactionStatus.matched, TransactionStatus.draft],
    TransactionStatus.matched: [TransactionStatus.handed_over, TransactionStatus.draft],
    TransactionStatus.handed_over: [TransactionStatus.confirmed],
    TransactionStatus.confirmed: [TransactionStatus.paid],
    TransactionStatus.paid: [TransactionStatus.closed],
    TransactionStatus.closed: [],
}

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles("recycler", "admin"))])

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
        material = db.query(Material).filter(Material.lot_id == lot_id).first()
        if not material:
            raise HTTPException(status_code=404, detail=f"Lot or material '{lot_id}' not found")

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


from pydantic import BaseModel
from app.models.traceability import TraceabilityEvent
from app.models.enums import EventActor

class AnomalyResolvePayload(BaseModel):
    action: Optional[str] = "clean"


@router.patch("/anomalies/{lot_id}/resolve")
def resolve_flagged_anomaly(
    lot_id: str,
    payload: Optional[AnomalyResolvePayload] = None,
    db: Session = Depends(get_db)
):
    """Mark an anomaly audit flag as resolved or fraud by admin."""
    action = payload.action if (payload and payload.action) else "clean"
    tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    
    # This exact notes string is checked by detect_transaction_anomalies to skip resolved lots
    note = "Anomaly review resolved"
    if tx:
        if action == "fraud":
            tx.status = TransactionStatus.closed
        
        event = TraceabilityEvent(
            lot_id=lot_id,
            event_type=tx.status,
            actor=EventActor.admin,
            notes=note,
        )
        db.add(event)
        db.commit()
    else:
        # Create traceability record even if standalone material/lot
        event = TraceabilityEvent(
            lot_id=lot_id,
            event_type=TransactionStatus.draft,
            actor=EventActor.admin,
            notes=note,
        )
        db.add(event)
        db.commit()

    return {
        "status": "resolved",
        "action": action,
        "lot_id": lot_id,
        "message": f"Anomaly flag for lot {lot_id} marked as {action.upper()} by admin.",
    }


@router.get("/minerals/impact")
def get_critical_minerals_impact(district: str = "Pune", db: Session = Depends(get_db)):
    """
    Returns estimated critical minerals recovery totals based on processed e-waste volume.
    Translates raw e-waste tonnage into strategic mineral values (Li, Co, Nd, Ta, Ga, In, Cu).
    """
    total_weight = db.query(func.sum(Material.approx_weight_kg)).scalar() or 0.0

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


# ─── Seed / demo data management (public, key-guarded) ────────────────────────

from fastapi import APIRouter as _APIRouter
from app.models.collector import Collector as _Collector

_seed_router = APIRouter(prefix="/admin", tags=["admin"])

@_seed_router.get("/seed-status")
def get_seed_status(db: Session = Depends(get_db)):
    """Check if demo data is seeded (public, safe to call)."""
    collectors = db.query(_Collector).count()
    recyclers = db.query(Recycler).count()
    from app.models.material import Material as _Material
    lots = db.query(_Material).count()
    return {
        "collectors": collectors,
        "recyclers": recyclers,
        "lots": lots,
        "seeded": collectors > 0 and recyclers > 0,
        "demo_phones": {
            "shop_owner": "9876543210",
            "feriwala_suresh": "9822011223",
            "feriwala_vikram": "9822044556",
            "independent_anil": "9800033333",
            "recycler_ecorecycle": "9888888888",
            "recycler_chinchwad": "9765432109",
            "recycler_greentech_mumbai": "9812345678",
        }
    }

@_seed_router.post("/seed-demo")
def force_seed_demo(secret: str = "kabadiwala-demo-2024", db: Session = Depends(get_db)):
    """Force-reseed the full demo dataset. Wipes existing data and re-seeds from scratch."""
    if secret != "kabadiwala-demo-2024":
        raise HTTPException(status_code=403, detail="Invalid seed secret")

    from app.seed import seed_database
    from app.models.recycler import Recycler as _Recycler
    from app.models.material import Material as _Material
    from app.models.transaction import Transaction as _Transaction
    from app.models.traceability import TraceabilityEvent as _TraceabilityEvent
    from app.models.price import PriceObservation as _PriceObservation
    from app.database import Base, engine

    # Wipe all tables and recreate so seed runs fresh
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    seed_database(db)

    collectors = db.query(_Collector).count()
    recyclers = db.query(_Recycler).count()
    lots = db.query(_Material).count()
    return {
        "status": "reseeded",
        "collectors": collectors,
        "recyclers": recyclers,
        "lots": lots,
    }
