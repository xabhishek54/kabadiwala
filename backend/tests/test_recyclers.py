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
from app.models.enums import AuthorizationStatus, MaterialCategory, MaterialCondition, TransactionStatus

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

def test_recycler_registration_and_hard_authorization_filter():
    # Register recycler 1 (pending by default)
    r1 = client.post("/recyclers", json={
        "name": "Unverified Recycler",
        "facility_lat": 18.52,
        "facility_lng": 73.85,
        "service_radius_km": 25.0,
        "materials_accepted": ["PCB"],
        "authorization_ref_no": "REF-001",
        "contact_phone": "+919000000001",
        "offered_rates": {"PCB": 300.0},
        "pickup_available": True
    }).json()
    assert r1["authorization_status"] == "pending"

    # Register recycler 2 (and verify them)
    r2 = client.post("/recyclers", json={
        "name": "Verified Recycler",
        "facility_lat": 18.52,
        "facility_lng": 73.85,
        "service_radius_km": 25.0,
        "materials_accepted": ["PCB"],
        "authorization_ref_no": "REF-002",
        "contact_phone": "+919000000002",
        "offered_rates": {"PCB": 260.0},
        "pickup_available": True
    }).json()

    client.patch(f"/recyclers/{r2['recycler_id']}/verify?status_value=verified")

    # Query matching recyclers for PCB
    matches = client.get("/recyclers/match/rank?category=PCB&lat=18.52&lng=73.85").json()

    # Unverified recycler MUST NOT be included in matches
    assert len(matches) == 1
    assert matches[0]["recycler"]["recycler_id"] == r2["recycler_id"]
    assert matches[0]["recycler"]["name"] == "Verified Recycler"


def test_recycler_lot_queue_only_returns_assigned_transactions():
    db = TestingSessionLocal()
    collector = Collector(
        collector_id="queue-collector",
        display_name="Queue Collector",
        phone_number="9111111122",
        operating_locality="Pune",
    )
    recycler = Recycler(
        recycler_id="queue-recycler",
        name="Queue Recycler",
        facility_lat=18.52,
        facility_lng=73.85,
        authorization_ref_no="QUEUE-REF",
        contact_phone="9111111133",
        authorization_status=AuthorizationStatus.verified,
        materials_accepted=["PCB"],
        offered_rates={"PCB": 250},
    )
    db.add_all([collector, recycler])
    for lot_id, assigned_recycler in (
        ("assigned-lot", "queue-recycler"),
        ("unassigned-lot", None),
    ):
        db.add(Material(
            lot_id=lot_id,
            material_category=MaterialCategory.PCB,
            sub_category="Board",
            approx_weight_kg=2,
            condition=MaterialCondition.intact,
            estimated_value=500,
            collector_id=collector.collector_id,
        ))
        db.add(Transaction(
            lot_id=lot_id,
            collector_id=collector.collector_id,
            recycler_id=assigned_recycler,
            status=TransactionStatus.matched,
            quoted_price=500,
        ))
    db.commit()
    db.close()

    response = client.get("/recyclers/queue-recycler/lots")
    assert response.status_code == 200
    assert [lot["lot_id"] for lot in response.json()] == ["assigned-lot"]
