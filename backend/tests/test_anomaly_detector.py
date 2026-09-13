"""
Tests for Phase 8: MAD Anomaly Detector Service & /admin/anomalies endpoint.

Spec ref: 05-ml-ai-guide.md §5, 02-features-implementation.md §8
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.enums import MaterialCategory, MaterialCondition, TransactionStatus
from app.services.anomaly_detector import compute_mad, detect_transaction_anomalies

TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_compute_mad_calculation():
    # Dataset: [10, 12, 14, 15, 16, 18, 100] (100 is outlier)
    values = [10.0, 12.0, 14.0, 15.0, 16.0, 18.0, 100.0]
    med, mad = compute_mad(values)
    assert med == 15.0
    assert mad > 0

class TestAnomalyDetector:
    @pytest.fixture(autouse=True)
    def setup_db(self):
        Base.metadata.create_all(bind=test_engine)
        db = TestingSessionLocal()

        c = Collector(collector_id="c_anom", display_name="Test Collector", phone_number="9111111111", operating_locality="Pune")
        db.add(c)

        # Normal lots around ₹300/kg
        for i in range(5):
            m = Material(
                lot_id=f"lot-norm-{i}",
                material_category=MaterialCategory.PCB,
                sub_category="Motherboard",
                approx_weight_kg=10.0,
                condition=MaterialCondition.intact,
                estimated_value=3000.0,
                collector_id="c_anom",
            )
            t = Transaction(lot_id=f"lot-norm-{i}", collector_id="c_anom", status=TransactionStatus.confirmed, final_sale_value=3000.0)
            db.add(m)
            db.add(t)

        # Anomalous lot 1: Overpriced ₹3000/kg (10x median)
        m_anom1 = Material(
            lot_id="lot-anom-1",
            material_category=MaterialCategory.PCB,
            sub_category="Motherboard",
            approx_weight_kg=10.0,
            condition=MaterialCondition.intact,
            estimated_value=30000.0,
            collector_id="c_anom",
        )
        t_anom1 = Transaction(lot_id="lot-anom-1", collector_id="c_anom", status=TransactionStatus.confirmed, final_sale_value=30000.0)
        db.add(m_anom1)
        db.add(t_anom1)

        # Anomalous lot 2: Condition Mismatch (Stripped sold at intact rates)
        m_anom2 = Material(
            lot_id="lot-anom-2",
            material_category=MaterialCategory.PCB,
            sub_category="Motherboard",
            approx_weight_kg=10.0,
            condition=MaterialCondition.stripped,
            estimated_value=3200.0,
            collector_id="c_anom",
        )
        t_anom2 = Transaction(lot_id="lot-anom-2", collector_id="c_anom", status=TransactionStatus.confirmed, final_sale_value=3200.0)
        db.add(m_anom2)
        db.add(t_anom2)

        db.commit()
        db.close()
        yield

        db_cleanup = TestingSessionLocal()
        db_cleanup.query(Transaction).filter(Transaction.collector_id == "c_anom").delete()
        db_cleanup.query(Material).filter(Material.collector_id == "c_anom").delete()
        db_cleanup.query(Collector).filter(Collector.collector_id == "c_anom").delete()
        db_cleanup.commit()
        db_cleanup.close()

    def test_detect_anomalies_service(self):
        db = TestingSessionLocal()
        anomalies = detect_transaction_anomalies(db=db, district="Pune")
        db.close()

        flagged_ids = [a["lot_id"] for a in anomalies]
        assert "lot-anom-1" in flagged_ids or "lot-anom-2" in flagged_ids

    def test_anomalies_endpoint_returns_200(self):
        resp = client.get("/admin/anomalies")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
