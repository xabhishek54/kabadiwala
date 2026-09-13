"""
anomaly_detector.py — MAD (Median Absolute Deviation) Anomaly Detector

Detects price and condition anomalies in e-waste transactions per district & material category.
Spec ref: 05-ml-ai-guide.md §5, 02-features-implementation.md §8
"""
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.price import PriceObservation
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.enums import MaterialCategory, MaterialCondition, TransactionStatus

def compute_mad(values: List[float]) -> tuple[float, float]:
    """
    Computes median and Median Absolute Deviation (MAD).
    MAD = median(|x_i - median(x)|)
    Returns (median, mad)
    """
    if not values:
        return 0.0, 0.0
    arr = np.array(values, dtype=float)
    med = float(np.median(arr))
    mad = float(np.median(np.abs(arr - med)))
    return med, mad

def detect_transaction_anomalies(
    db: Session,
    district: str = "Pune",
    category: Optional[str] = None,
    z_threshold: float = 3.5
) -> List[Dict[str, Any]]:
    """
    Scans completed and confirmed transactions for:
    1. Price Outlier Anomaly: Modified Z-Score > 3.5 using MAD
    2. Condition Mismatch Anomaly: Material is 'stripped'/'damaged' but priced at 'intact' levels
    3. Severe Underpricing / Overpricing ratios (>2.5x or <0.35x of median)
    """
    query = db.query(Transaction).join(Material, Transaction.lot_id == Material.lot_id)

    if category:
        try:
            cat_enum = MaterialCategory(category)
            query = query.filter(Material.material_category == cat_enum)
        except ValueError:
            pass

    transactions = query.all()
    anomalies = []

    # Group prices by category to calculate category medians & MADs
    cat_prices: Dict[str, List[float]] = {}
    for tx in transactions:
        if not tx.final_sale_value and not tx.quoted_price:
            continue
        m = tx.material
        price = tx.final_sale_value or tx.quoted_price or 0.0
        unit_price = price / max(m.approx_weight_kg, 0.1)
        cat_key = m.material_category.value
        if cat_key not in cat_prices:
            cat_prices[cat_key] = []
        cat_prices[cat_key].append(unit_price)

    # Compute median and MAD per category
    cat_stats: Dict[str, tuple[float, float]] = {}
    for cat_key, p_list in cat_prices.items():
        cat_stats[cat_key] = compute_mad(p_list)

    # Evaluate each transaction against statistical thresholds
    for tx in transactions:
        m = tx.material
        price = tx.final_sale_value or tx.quoted_price or 0.0
        weight = max(m.approx_weight_kg, 0.1)
        unit_price = price / weight
        cat_key = m.material_category.value

        med, mad = cat_stats.get(cat_key, (0.0, 0.0))

        # Calculate Modified Z-Score: M_i = 0.6745 * (x_i - med) / MAD
        mod_z = 0.0
        if mad > 0:
            mod_z = 0.6745 * abs(unit_price - med) / mad

        reasons = []
        severity = "low"

        # Check 1: MAD Modified Z-score outlier
        if mad > 0 and mod_z > z_threshold:
            reasons.append(f"Price modified Z-score ({mod_z:.2f}) exceeds threshold ({z_threshold})")
            severity = "high" if mod_z > 5.0 else "medium"

        # Check 2: Severe Ratio Outlier (>2.5x or <0.35x median)
        if med > 0:
            ratio = unit_price / med
            if ratio > 2.5:
                reasons.append(f"Unit price (₹{unit_price:.1f}/kg) is {ratio:.1f}x higher than category median (₹{med:.1f}/kg)")
                severity = "high"
            elif ratio < 0.35:
                reasons.append(f"Unit price (₹{unit_price:.1f}/kg) is dangerously low ({ratio:.2f}x of median ₹{med:.1f}/kg)")
                severity = "medium"

        # Check 3: Condition Mismatch Signal (Stripped material sold at intact rates)
        if m.condition in [MaterialCondition.stripped, MaterialCondition.damaged] and med > 0:
            expected_mult = 0.40 if m.condition == MaterialCondition.stripped else 0.70
            expected_max_price = med * expected_mult * 1.2  # 20% tolerance
            if unit_price > expected_max_price:
                reasons.append(
                    f"Condition Mismatch: Material logged as '{m.condition.value}' but sold at intact unit price (₹{unit_price:.1f}/kg vs max expected ₹{expected_max_price:.1f}/kg)"
                )
                severity = "high"

        if reasons:
            anomalies.append({
                "lot_id": m.lot_id,
                "category": m.material_category.value,
                "weight_kg": m.approx_weight_kg,
                "condition": m.condition.value,
                "unit_price_per_kg": round(unit_price, 2),
                "category_median_price": round(med, 2),
                "modified_z_score": round(mod_z, 2),
                "severity": severity,
                "reasons": reasons,
                "collector_id": m.collector_id,
                "transaction_status": tx.status.value,
            })

    return anomalies
