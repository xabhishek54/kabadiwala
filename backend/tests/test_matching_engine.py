"""
Tests for Phase 11: Learned Recycler Matching Blend.

Spec ref: 05-ml-ai-guide.md §3, 06-development-deployment.md §2 (Phase 11)
"""
import pytest
from app.services.matching_engine import (
    haversine_distance,
    compute_deterministic_score,
    predict_completion_probability,
    compute_blended_matching_score
)

def test_haversine_distance_pune():
    # Distance between Hadapsar, Pune (18.5089, 73.9259) and Shivajinagar, Pune (18.5314, 73.8446) ~ 9 km
    dist = haversine_distance(18.5089, 73.9259, 18.5314, 73.8446)
    assert 7.0 < dist < 12.0

def test_deterministic_score_calculation():
    score = compute_deterministic_score(
        offered_price=300.0,
        max_rate=300.0,
        distance_km=5.0,
        max_distance_km=25.0,
        pickup_available=True,
    )
    assert 0.7 < score <= 1.0

def test_predict_completion_probability():
    prob_close = predict_completion_probability(distance_km=2.0, offered_price=350.0, pickup_available=True)
    prob_far = predict_completion_probability(distance_km=40.0, offered_price=100.0, pickup_available=False)
    assert prob_close > prob_far
    assert 0.0 <= prob_close <= 1.0

def test_blended_matching_score():
    final_score, s_det, p_comp = compute_blended_matching_score(
        offered_price=300.0,
        max_rate=300.0,
        distance_km=5.0,
        max_distance_km=25.0,
        pickup_available=True,
        alpha=0.70
    )
    assert final_score == round(0.70 * s_det + 0.30 * p_comp, 4)
