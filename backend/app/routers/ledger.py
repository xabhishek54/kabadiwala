from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.collector import Collector
from app.models.transaction import Transaction
from app.models.material import Material
from app.models.recycler import Recycler
from app.models.enums import TransactionStatus, PaymentStatus, AccountType
from app.auth import require_auth

router = APIRouter(prefix="/ledger", tags=["ledger"], dependencies=[Depends(require_auth)])


def _build_item(tx: Transaction, mat: Material, recycler: Optional[Recycler] = None) -> Dict[str, Any]:
    """Build a fully-populated traceability item dict from a transaction+material pair."""
    val = tx.final_sale_value or tx.quoted_price or mat.estimated_value or 0.0
    return {
        # Core identifiers
        "lot_id": tx.lot_id,
        "collector_id": tx.collector_id,
        # Material fields
        "material_category": mat.material_category.value if hasattr(mat.material_category, 'value') else str(mat.material_category),
        "sub_category": mat.sub_category,
        "description": mat.description,
        "image_ref": mat.image_ref,
        "weight_kg": mat.approx_weight_kg,
        "condition": mat.condition.value if mat.condition else None,
        "source_type": mat.source_type.value if mat.source_type else None,
        # Pricing fields (all three price stages)
        "estimated_value": mat.estimated_value,
        "quoted_price": tx.quoted_price,
        "final_sale_value": tx.final_sale_value,
        "amount": val,
        # Transaction status
        "status": tx.status.value if hasattr(tx.status, 'value') else str(tx.status),
        "payment_status": tx.payment_status.value if hasattr(tx.payment_status, 'value') else str(tx.payment_status),
        "payment_method": tx.payment_method.value if hasattr(tx.payment_method, 'value') else str(tx.payment_method),
        # Location — collection point and handover point
        "collection_lat": tx.collection_lat,
        "collection_lng": tx.collection_lng,
        "handover_lat": tx.handover_lat,
        "handover_lng": tx.handover_lng,
        # Recycler details (denormalized for traceability)
        "recycler_id": tx.recycler_id,
        "recycler_name": recycler.name if recycler else None,
        "recycler_auth_ref": recycler.authorization_ref_no if recycler else None,
        # Timestamps
        "created_at": tx.created_at.isoformat() if tx.created_at else "",
        "updated_at": tx.updated_at.isoformat() if tx.updated_at else "",
    }


@router.get("/{collector_id}")
def get_collector_ledger(collector_id: str, db: Session = Depends(get_db), principal: dict = Depends(require_auth)):
    if principal.get("role") == "collector" and collector_id != principal["sub"]:
        raise HTTPException(status_code=403, detail="Ledger belongs to another collector")
    if principal.get("role") == "recycler" and collector_id != principal["sub"]:
        raise HTTPException(status_code=403, detail="Ledger belongs to another facility")
    collector = db.query(Collector).filter(Collector.collector_id == collector_id).first()
    if not collector:
        recycler = db.query(Recycler).filter(Recycler.recycler_id == collector_id).first()
        if recycler:
            txs = db.query(Transaction, Material).join(
                Material, Transaction.lot_id == Material.lot_id
            ).filter(
                Transaction.recycler_id == collector_id
            ).order_by(Transaction.created_at.desc()).all()

            total_paid = 0.0
            total_pending = 0.0
            items = []

            for tx, mat in txs:
                recycler = db.query(Recycler).filter(Recycler.recycler_id == tx.recycler_id).first() if tx.recycler_id else None
                item = _build_item(tx, mat, recycler)
                val = item["amount"]
                if tx.payment_status == PaymentStatus.paid or tx.status == TransactionStatus.closed:
                    total_paid += val
                else:
                    total_pending += val
                items.append(item)

            return {
                "collector_id": collector_id,
                "recycler_id": collector_id,
                "account_type": "recycler",
                "total_earned": round(total_paid, 2),
                "total_pending": round(total_pending, 2),
                "transaction_count": len(items),
                "items": items,
            }
        raise HTTPException(status_code=404, detail="Collector or Recycler not found")

    # Determine all collector IDs to include (shop owner includes sub-collectors)
    target_ids = [collector_id]
    if collector.account_type == AccountType.shop:
        sub_collectors = db.query(Collector).filter(Collector.parent_shop_id == collector_id).all()
        target_ids.extend([s.collector_id for s in sub_collectors])

    txs = db.query(Transaction, Material).join(
        Material, Transaction.lot_id == Material.lot_id
    ).filter(
        Transaction.collector_id.in_(target_ids)
    ).order_by(Transaction.created_at.desc()).all()

    total_earned = 0.0
    total_pending = 0.0
    items = []

    for tx, mat in txs:
        recycler = db.query(Recycler).filter(Recycler.recycler_id == tx.recycler_id).first() if tx.recycler_id else None
        item = _build_item(tx, mat, recycler)
        val = item["amount"]
        if tx.payment_status == PaymentStatus.paid or tx.status == TransactionStatus.closed:
            total_earned += val
        else:
            total_pending += val
        items.append(item)

    return {
        "collector_id": collector_id,
        "account_type": collector.account_type.value if hasattr(collector.account_type, 'value') else str(collector.account_type),
        "total_earned": round(total_earned, 2),
        "total_pending": round(total_pending, 2),
        "transaction_count": len(items),
        "items": items,
    }
