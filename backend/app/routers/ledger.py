from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.collector import Collector
from app.models.transaction import Transaction
from app.models.material import Material
from app.models.enums import TransactionStatus, PaymentStatus, AccountType

router = APIRouter(prefix="/ledger", tags=["ledger"])

@router.get("/{collector_id}")
def get_collector_ledger(collector_id: str, db: Session = Depends(get_db)):
    collector = db.query(Collector).filter(Collector.collector_id == collector_id).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector not found")

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
        val = tx.final_sale_value or tx.quoted_price or mat.estimated_value or 0.0
        if tx.payment_status == PaymentStatus.paid or tx.status == TransactionStatus.closed:
            total_earned += val
        else:
            total_pending += val

        items.append({
            "lot_id": tx.lot_id,
            "collector_id": tx.collector_id,
            "material_category": mat.material_category.value,
            "weight_kg": mat.approx_weight_kg,
            "amount": val,
            "status": tx.status.value,
            "payment_status": tx.payment_status.value,
            "payment_method": tx.payment_method.value,
            "created_at": tx.created_at.isoformat(),
        })

    return {
        "collector_id": collector_id,
        "account_type": collector.account_type.value,
        "total_earned": round(total_earned, 2),
        "total_pending": round(total_pending, 2),
        "transaction_count": len(items),
        "items": items,
    }
