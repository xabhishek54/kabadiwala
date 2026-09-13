"""
pricing_engine.py — Server-side Gradient-Boosted price refinement model.

Uses a scikit-learn GradientBoostingRegressor trained on bootstrap synthetic
price observations to refine the client-computed base estimate. When the model
has insufficient observations it falls back to the deterministic formula.

Spec ref: 05-ml-ai-guide.md §2, §4; 02-features-implementation.md §5
"""
from __future__ import annotations

import logging
from typing import Dict, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.models.enums import MaterialCategory
from app.models.price import PriceObservation

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Hard-coded condition multipliers (authoritative server copy)
# --------------------------------------------------------------------------- #
_CONDITION_MULTIPLIERS: Dict[str, float] = {
    "intact": 1.0,
    "damaged": 0.70,
    "stripped": 0.40,
}

# Minimum records needed before the ML model is trusted over the deterministic rule
_MIN_SAMPLES_FOR_ML = 5


def _feature_vector(
    category: str,
    weight_kg: float,
    condition: str,
    base_price: float,
    district_sample_count: int,
    trend_slope: float,
) -> np.ndarray:
    """Encode inputs to a feature array for the GBDT regressor."""
    cat_order = {c.value: i for i, c in enumerate(MaterialCategory)}
    cat_idx = cat_order.get(category, 0)
    cond_idx = {"intact": 0, "damaged": 1, "stripped": 2}.get(condition, 0)
    return np.array([[
        cat_idx,
        weight_kg,
        cond_idx,
        base_price,
        district_sample_count,
        max(min(trend_slope, 5.0), -5.0),  # clip slope
    ]])


def _train_model(observations: list):
    """Train a GradientBoostingRegressor on historical price observations."""
    try:
        from sklearn.ensemble import GradientBoostingRegressor

        cat_order = {c.value: i for i, c in enumerate(MaterialCategory)}

        X, y = [], []
        for obs in observations:
            cat_idx = cat_order.get(obs.material_category.value, 0)
            # We don't have condition stored in PriceObservation, so use a neutral value
            X.append([cat_idx, 10.0, 0, obs.buying_price, len(observations), 0.0])
            y.append(obs.buying_price)

        if len(X) < _MIN_SAMPLES_FOR_ML:
            return None

        model = GradientBoostingRegressor(
            n_estimators=50,
            max_depth=3,
            learning_rate=0.15,
            random_state=42,
        )
        model.fit(X, y)
        return model
    except Exception as exc:
        logger.warning("GBDT training failed: %s", exc)
        return None


def refine_price(
    *,
    category: str,
    weight_kg: float,
    condition: str,
    district: str,
    db: Session,
) -> Dict:
    """
    Refine the price estimate using:
      1. Median district price from observations.
      2. Condition multiplier.
      3. Optional GBDT upward/downward adjustment.

    Returns a dict with refined price, base price, multiplier, confidence, and
    explainability breakdown.
    """
    from datetime import datetime, timedelta, timezone

    # ---- 1. Fetch recent district price observations --------------------
    cutoff = datetime.now(timezone.utc) - timedelta(days=28)
    obs_all = (
        db.query(PriceObservation)
        .filter(
            PriceObservation.material_category == category,
            PriceObservation.observed_at >= cutoff,
        )
        .all()
    )
    district_obs = [o for o in obs_all if o.location_district == district]
    prices = [o.buying_price for o in district_obs] if district_obs else [o.buying_price for o in obs_all]

    if prices:
        base_price_per_kg = float(np.median(prices))
        sample_count = len(prices)
    else:
        # Fallback hardcoded reference prices (from spec §04 Table 1)
        _FALLBACK: Dict[str, float] = {
            "PCB": 260.0,
            "BATTERY": 90.0,
            "CABLE": 150.0,
            "LCD_PANEL": 110.0,
            "CRT": 40.0,
            "MOTOR_MAGNET": 70.0,
            "MIXED_PLASTIC": 25.0,
        }
        base_price_per_kg = _FALLBACK.get(category, 100.0)
        sample_count = 0

    # ---- 2. Condition multiplier ----------------------------------------
    cond_mult = _CONDITION_MULTIPLIERS.get(condition, 1.0)
    deterministic_total = round(weight_kg * base_price_per_kg * cond_mult, 2)

    # ---- 3. Try GBDT refinement -----------------------------------------
    ml_adjustment = 0.0
    ml_confidence = 0.0
    model = None
    if len(obs_all) >= _MIN_SAMPLES_FOR_ML:
        model = _train_model(obs_all)

    if model is not None:
        try:
            # Compute trend slope (simple linear fit over timestamps)
            if len(obs_all) >= 3:
                from datetime import timezone as tz
                ts = [(o.observed_at - cutoff).total_seconds() / 86400.0 for o in obs_all]
                ps = [o.buying_price for o in obs_all]
                slope = float(np.polyfit(ts, ps, 1)[0]) if len(set(ts)) > 1 else 0.0
            else:
                slope = 0.0

            fv = _feature_vector(category, weight_kg, condition, base_price_per_kg, sample_count, slope)
            predicted_per_kg = float(model.predict(fv)[0])

            # Blend: 70% deterministic base + 30% ML prediction per kg
            blended_per_kg = 0.70 * base_price_per_kg + 0.30 * predicted_per_kg
            blended_total = round(weight_kg * blended_per_kg * cond_mult, 2)
            ml_adjustment = round(blended_total - deterministic_total, 2)
            ml_confidence = min(0.85, 0.5 + 0.07 * min(sample_count, 5))
            refined_total = blended_total
        except Exception as exc:
            logger.warning("GBDT inference failed, falling back to deterministic: %s", exc)
            refined_total = deterministic_total
    else:
        refined_total = deterministic_total
        ml_confidence = 0.0

    market_low = round(base_price_per_kg * 0.92, 2)
    market_high = round(base_price_per_kg * 1.08, 2)

    return {
        "base_price_per_kg": round(base_price_per_kg, 2),
        "condition_multiplier": cond_mult,
        "weight_kg": weight_kg,
        "deterministic_total": deterministic_total,
        "ml_adjustment": ml_adjustment,
        "refined_total": round(refined_total, 2),
        "market_low": round(market_low * weight_kg * cond_mult, 2),
        "market_high": round(market_high * weight_kg * cond_mult, 2),
        "ml_confidence": round(ml_confidence, 3),
        "sample_count": sample_count,
        "district": district,
    }
