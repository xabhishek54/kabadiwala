import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_create_collector_and_lot():
    # 1. Create a collector first
    col_res = client.post("/sync/push", json={
        "collector_id": "col-uuid-1",
        "items": []
    })
    # Create material lot
    payload = {
        "lot_id": "lot-uuid-1",
        "material_category": "PCB",
        "sub_category": "Motherboard",
        "approx_weight_kg": 5.0,
        "condition": "intact",
        "estimated_value": 1250.0,
        "collector_id": "col-uuid-1",
        "source_type": "household"
    }

    # First register collector in DB
    from app.models.collector import Collector
    db = TestingSessionLocal()
    db.add(Collector(collector_id="col-uuid-1", phone_number="+919999999999", operating_locality="Kothrud"))
    db.commit()
    db.close()

    res = client.post("/lots", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["lot_id"] == "lot-uuid-1"
    assert data["material_category"] == "PCB"
    assert data["approx_weight_kg"] == 5.0

def test_state_machine_transition_validation():
    db = TestingSessionLocal()
    from app.models.collector import Collector
    db.add(Collector(collector_id="col-uuid-2", phone_number="+918888888888", operating_locality="Viman Nagar"))
    db.commit()
    db.close()

    client.post("/lots", json={
        "lot_id": "lot-uuid-2",
        "material_category": "BATTERY",
        "sub_category": "Lead Acid",
        "approx_weight_kg": 10.0,
        "estimated_value": 900.0,
        "collector_id": "col-uuid-2"
    })

    # Valid transition: draft -> quoted
    res = client.post("/lots/lot-uuid-2/transition?target_status=quoted")
    assert res.status_code == 200
    assert res.json()["status"] == "quoted"

    # Invalid transition: quoted -> paid (must go via matched -> handed_over -> confirmed -> paid)
    res_inv = client.post("/lots/lot-uuid-2/transition?target_status=paid")
    assert res_inv.status_code == 400
    assert "Invalid transition" in res_inv.json()["detail"]
