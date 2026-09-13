"""
Tests for Phase 7: Admin & Recycler Dashboard Endpoints.

Spec ref: 02-features-implementation.md §7, 06-development-deployment.md §2 (Phase 7)
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
from app.models.recycler import Recycler
from app.models.enums import MaterialCategory, MaterialCondition, TransactionStatus, AuthorizationStatus

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

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    c = Collector(collector_id="admin-c1", display_name="Ramesh Kumar", phone_number="9876543210", operating_locality="Hadapsar, Pune")
    db.add(c)

    m1 = Material(
        lot_id="lot-admin-101",
        material_category=MaterialCategory.PCB,
        sub_category="Motherboard",
        approx_weight_kg=12.5,
        condition=MaterialCondition.intact,
        estimated_value=3500.0,
        collector_id="admin-c1",
    )
    db.add(m1)

    t1 = Transaction(
        lot_id="lot-admin-101",
        collector_id="admin-c1",
        status=TransactionStatus.matched,
        quoted_price=3500.0,
    )
    db.add(t1)

    r1 = Recycler(
        recycler_id="admin-r1",
        name="EcoRecycle India",
        facility_lat=18.5204,
        facility_lng=73.8567,
        authorization_ref_no="MPCB-2024-890",
        contact_phone="9988776655",
        authorization_status=AuthorizationStatus.verified,
        materials_accepted=["PCB", "BATTERY"],
        offered_rates={"PCB": 300.0, "BATTERY": 120.0},
    )
    db.add(r1)

    db.commit()
    db.close()
    yield
    # Clean up created rows without dropping tables
    db_cleanup = TestingSessionLocal()
    db_cleanup.query(Transaction).filter(Transaction.lot_id == "lot-admin-101").delete()
    db_cleanup.query(Material).filter(Material.lot_id == "lot-admin-101").delete()
    db_cleanup.query(Collector).filter(Collector.collector_id == "admin-c1").delete()
    db_cleanup.query(Recycler).filter(Recycler.recycler_id == "admin-r1").delete()
    db_cleanup.commit()
    db_cleanup.close()


def test_list_admin_lots():
    resp = client.get("/admin/lots")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    lot_ids = [d["lot_id"] for d in data]
    assert "lot-admin-101" in lot_ids


def test_update_lot_status():
    resp = client.patch("/admin/lots/lot-admin-101/status?status=confirmed&final_sale_value=3600.0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "confirmed"

    resp2 = client.get("/admin/lots")
    data2 = resp2.json()
    matching = [d for d in data2 if d["lot_id"] == "lot-admin-101"]
    assert len(matching) == 1
    assert matching[0]["status"] == "confirmed"
    assert matching[0]["final_sale_value"] == 3600.0


def test_dashboard_stats():
    resp = client.get("/admin/dashboard-stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lots"] >= 1
    assert data["total_weight_kg"] >= 12.5
