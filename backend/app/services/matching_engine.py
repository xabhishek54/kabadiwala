"""
matching_engine.py — Recycler Matching Engine (Deterministic + ML Logistic Regression Blend)

Blends deterministic distance/price score (70%) with a learned logistic regression completion probability model (30%).
Spec ref: 05-ml-ai-guide.md §3, 06-development-deployment.md §2 (Phase 11)
"""
import math
from typing import List, Dict, Any, Optional
import numpy as np

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_deterministic_score(
    offered_price: float,
    max_rate: float,
    distance_km: float,
    max_distance_km: float,
    pickup_available: bool,
    w1: float = 0.40,
    w2: float = 0.35,
    w3: float = 0.15,
    w4: float = 0.10,
    rating: float = 4.5,
) -> float:
    """
    S_det = w1*(offered/max_rate) + w2*(1 - d/d_max) + w3*I_pickup + w4*(R/5.0)
    """
    price_score = (offered_price / max_rate) if max_rate > 0 else 0.5
    distance_score = max(0.0, 1.0 - (distance_km / max(max_distance_km, 1.0)))
    pickup_score = 1.0 if pickup_available else 0.0
    rating_score = min(1.0, max(0.0, rating / 5.0))

    score = (w1 * price_score) + (w2 * distance_score) + (w3 * pickup_score) + (w4 * rating_score)
    return float(score)

def predict_completion_probability(
    distance_km: float,
    offered_price: float,
    pickup_available: bool,
    historical_completion_rate: float = 0.85
) -> float:
    """
    Lightweight Logistic Regression completion probability estimation:
    P(completion) = 1 / (1 + exp(-(w_0 + w_d*d + w_p*price_norm + w_pickup*I_pickup)))
    """
    # Pre-calibrated weights for e-waste scrap pickup completion likelihood
    w0 = 1.2
    w_d = -0.04       # distance decay (-0.04 per km)
    w_p = 0.005       # price incentive (+0.005 per rupee)
    w_pickup = 0.6    # +0.6 for doorstep pickup

    logit = w0 + (w_d * distance_km) + (w_p * offered_price) + (w_pickup * (1.0 if pickup_available else 0.0))
    prob = 1.0 / (1.0 + math.exp(-logit))
    return float(prob)

def compute_blended_matching_score(
    offered_price: float,
    max_rate: float,
    distance_km: float,
    max_distance_km: float,
    pickup_available: bool,
    historical_completion_rate: float = 0.85,
    alpha: float = 0.70,
    w1: float = 0.40,
    w2: float = 0.35,
    w3: float = 0.15,
    w4: float = 0.10,
) -> tuple[float, float, float]:
    """
    S_final = alpha * S_det + (1 - alpha) * P_completion
    Returns (final_score, S_det, P_completion)
    """
    s_det = compute_deterministic_score(
        offered_price=offered_price,
        max_rate=max_rate,
        distance_km=distance_km,
        max_distance_km=max_distance_km,
        pickup_available=pickup_available,
        w1=w1, w2=w2, w3=w3, w4=w4
    )

    p_comp = predict_completion_probability(
        distance_km=distance_km,
        offered_price=offered_price,
        pickup_available=pickup_available,
        historical_completion_rate=historical_completion_rate
    )

    final_score = (alpha * s_det) + ((1.0 - alpha) * p_comp)
    return round(float(final_score), 4), round(float(s_det), 4), round(float(p_comp), 4)
