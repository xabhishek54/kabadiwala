"""
Tests for Phase 5: pricing_engine service and /prices/refine endpoint.

Spec ref: 05-ml-ai-guide.md §2, §4, §6
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


# ---- Pricing engine service unit tests ------------------------------------

class TestPricingEngineService:
    """Unit tests for services/pricing_engine.py"""

    def test_refine_price_returns_dict_with_required_keys(self):
        from app.services.pricing_engine import refine_price
        db = TestingSessionLocal()
        result = refine_price(
            category="PCB",
            weight_kg=10.0,
            condition="intact",
            district="Pune",
            db=db,
        )
        db.close()

        required_keys = {
            "base_price_per_kg", "condition_multiplier", "weight_kg",
            "deterministic_total", "ml_adjustment", "refined_total",
            "market_low", "market_high", "ml_confidence", "sample_count",
        }
        assert required_keys.issubset(result.keys()), f"Missing keys: {required_keys - result.keys()}"

    def test_refine_price_fallback_for_unknown_category(self):
        from app.services.pricing_engine import refine_price
        db = TestingSessionLocal()
        result = refine_price(
            category="UNKNOWN_CAT",
            weight_kg=5.0,
            condition="intact",
            district="Mumbai",
            db=db,
        )
        db.close()
        assert result["refined_total"] > 0

    def test_condition_multiplier_intact(self):
        from app.services.pricing_engine import refine_price
        db = TestingSessionLocal()
        r_intact = refine_price(category="CABLE", weight_kg=10.0, condition="intact", district="Pune", db=db)
        r_stripped = refine_price(category="CABLE", weight_kg=10.0, condition="stripped", district="Pune", db=db)
        db.close()
        assert r_stripped["deterministic_total"] < r_intact["deterministic_total"]

    def test_condition_multipliers_match_spec(self):
        """Verify condition multipliers: intact=1.0, damaged=0.70, stripped=0.40"""
        from app.services.pricing_engine import _CONDITION_MULTIPLIERS
        assert _CONDITION_MULTIPLIERS["intact"] == 1.0
        assert _CONDITION_MULTIPLIERS["damaged"] == pytest.approx(0.70, rel=0.01)
        assert _CONDITION_MULTIPLIERS["stripped"] == pytest.approx(0.40, rel=0.01)

    def test_ml_confidence_is_zero_with_no_observations(self):
        from app.services.pricing_engine import refine_price
        db = TestingSessionLocal()
        result = refine_price(category="PCB", weight_kg=5.0, condition="intact", district="Pune", db=db)
        db.close()
        assert result["ml_confidence"] == 0.0


# ---- /prices/refine endpoint tests ----------------------------------------

class TestPriceRefineEndpoint:
    """Integration tests for POST /prices/refine"""

    def test_refine_endpoint_returns_200(self):
        resp = client.post("/prices/refine", json={
            "category": "PCB",
            "weight_kg": 10.0,
            "condition": "intact",
            "district": "Pune",
        })
        assert resp.status_code == 200

    def test_refine_endpoint_response_structure(self):
        resp = client.post("/prices/refine", json={
            "category": "BATTERY",
            "weight_kg": 5.0,
            "condition": "damaged",
            "district": "Mumbai",
        })
        data = resp.json()
        assert "refined_total" in data
        assert "base_price_per_kg" in data
        assert "ml_confidence" in data
        assert data["refined_total"] > 0

    def test_refine_default_district(self):
        resp = client.post("/prices/refine", json={
            "category": "CABLE",
            "weight_kg": 3.0,
            "condition": "intact",
        })
        assert resp.status_code == 200
        assert resp.json()["district"] == "Pune"

    def test_refine_stripped_is_cheaper_than_intact(self):
        r_intact = client.post("/prices/refine", json={"category": "PCB", "weight_kg": 10.0, "condition": "intact"}).json()
        r_stripped = client.post("/prices/refine", json={"category": "PCB", "weight_kg": 10.0, "condition": "stripped"}).json()
        assert r_stripped["refined_total"] < r_intact["refined_total"]
