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
