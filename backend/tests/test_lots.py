import pytest

from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.enums import MaterialCategory, MaterialCondition, TransactionStatus

# Import shared test infrastructure from conftest
from tests.helpers import client, TestingSessionLocal


def test_create_collector_and_lot():
    # First register collector in DB
    db = TestingSessionLocal()
    db.add(Collector(collector_id="col-uuid-1", phone_number="+919999999999", operating_locality="Kothrud"))
    db.commit()
    db.close()

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

    res = client.post("/lots", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["lot_id"] == "lot-uuid-1"
    assert data["material_category"] == "PCB"
    assert data["approx_weight_kg"] == 5.0


def test_state_machine_transition_validation():
    db = TestingSessionLocal()
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


def test_sync_preserves_lot_fields_and_is_idempotent():
    db = TestingSessionLocal()
    db.add(Collector(
        collector_id="collector-sync-1",
        phone_number="+919700000001",
        operating_locality="Pune",
    ))
    db.commit()
    db.close()

    sync_item = {
        "client_uuid": "lot-sync-1",
        "entity_type": "material",
        "action": "create",
        "payload": {
            "lot_id": "lot-sync-1",
            "material_category": "PCB",
            "sub_category": "Motherboard",
            "approx_weight_kg": 7.5,
            "condition": "damaged",
            "source_type": "commercial",
            "estimated_value": 1365.0,
        },
        "client_timestamp": "2025-01-01T00:00:00Z",
    }
    request = {"collector_id": "collector-sync-1", "items": [sync_item]}

    first = client.post("/sync/push", json=request)
    second = client.post("/sync/push", json=request)
    assert first.status_code == 200
    assert first.json()["results"][0]["status"] == "synced"
    assert second.json()["results"][0]["status"] == "synced"

    db = TestingSessionLocal()
    material = db.query(Material).filter(Material.lot_id == "lot-sync-1").one()
    transaction = db.query(Transaction).filter(Transaction.lot_id == "lot-sync-1").one()
    events = db.query(TraceabilityEvent).filter(TraceabilityEvent.lot_id == "lot-sync-1").all()
    assert material.approx_weight_kg == 7.5
    assert material.condition.value == "damaged"
    assert material.source_type.value == "commercial"
    assert transaction.status.value == "quoted"
    assert len(events) == 2
    db.close()


def test_sync_rejects_invalid_transaction_transition_without_mutating_state():
    db = TestingSessionLocal()
    db.add(Collector(
        collector_id="collector-sync-2",
        phone_number="+919700000002",
        operating_locality="Pune",
    ))
    db.commit()
    db.close()

    client.post("/lots", json={
        "lot_id": "lot-sync-2",
        "material_category": "BATTERY",
        "sub_category": "Lithium-Ion",
        "approx_weight_kg": 2.0,
        "estimated_value": 180.0,
        "collector_id": "collector-sync-2",
    })
    client.post("/lots/lot-sync-2/transition?target_status=quoted")
    response = client.post("/sync/push", json={
        "collector_id": "collector-sync-2",
        "items": [{
            "client_uuid": "lot-sync-2",
            "entity_type": "transaction",
            "action": "upsert",
            "payload": {"lot_id": "lot-sync-2", "status": "paid"},
            "client_timestamp": "2025-01-01T00:00:00Z",
        }],
    })

    assert response.status_code == 200
    assert response.json()["results"][0]["status"] == "rejected"
    db = TestingSessionLocal()
    transaction = db.query(Transaction).filter(Transaction.lot_id == "lot-sync-2").one()
    assert transaction.status.value == "quoted"
    db.close()


def test_handover_requires_valid_code_and_records_state_history():
    from app.models.enums import TransactionStatus

    db = TestingSessionLocal()
    db.add(Collector(
        collector_id="collector-handover-1",
        phone_number="+919700000003",
        operating_locality="Pune",
    ))
    db.commit()
    db.close()

    recycler_response = client.post("/recyclers", json={
        "name": "Verified Test Recycler",
        "facility_lat": 18.52,
        "facility_lng": 73.85,
        "service_radius_km": 25.0,
        "materials_accepted": ["PCB"],
        "authorization_ref_no": "REF-HANDOVER-1",
        "contact_phone": "+919700000004",
        "offered_rates": {"PCB": 180.0},
        "pickup_available": True,
    })
    recycler_id = recycler_response.json()["recycler_id"]
    client.patch(f"/recyclers/{recycler_id}/verify?status_value=verified")
    client.post("/lots", json={
        "lot_id": "lot-handover-1",
        "material_category": "PCB",
        "sub_category": "Motherboard",
        "approx_weight_kg": 2.0,
        "estimated_value": 360.0,
        "collector_id": "collector-handover-1",
    })
    client.post("/lots/lot-handover-1/transition?target_status=quoted")
    client.post(f"/lots/lot-handover-1/transition?target_status=matched&recycler_id={recycler_id}")

    token = client.get("/handovers/lot-handover-1/qr-token").json()
    invalid_code = ("0" if token["short_code"][0] != "0" else "1") + token["short_code"][1:]
    invalid = client.post("/handovers/confirm", json={
        "lot_id": "lot-handover-1",
        "recycler_id": recycler_id,
        "short_code": invalid_code,
        "final_sale_value": 350.0,
        "payment_method": "cash",
    })
    assert invalid.status_code == 400

    confirmed = client.post("/handovers/confirm", json={
        "lot_id": "lot-handover-1",
        "recycler_id": recycler_id,
        "short_code": token["short_code"],
        "final_sale_value": 350.0,
        "payment_method": "cash",
    })
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "closed"
    assert confirmed.json()["payment_status"] == "paid"

    duplicate = client.post("/handovers/confirm", json={
        "lot_id": "lot-handover-1",
        "recycler_id": recycler_id,
        "short_code": token["short_code"],
        "final_sale_value": 350.0,
        "payment_method": "cash",
    })
    assert duplicate.status_code == 409

    db = TestingSessionLocal()
    transaction = db.query(Transaction).filter(Transaction.lot_id == "lot-handover-1").one()
    events = db.query(TraceabilityEvent).filter(
        TraceabilityEvent.lot_id == "lot-handover-1"
    ).all()
    event_states = [event.event_type for event in events]
    assert transaction.status == TransactionStatus.closed
    assert TransactionStatus.handed_over in event_states
    assert TransactionStatus.confirmed in event_states
    assert TransactionStatus.paid in event_states
    assert TransactionStatus.closed in event_states
    db.close()


def test_public_recycler_verify_exposes_only_public_authorization_fields():
    recycler_response = client.post("/recyclers", json={
        "name": "Public Verify Recycler",
        "facility_lat": 18.52,
        "facility_lng": 73.85,
        "service_radius_km": 25.0,
        "materials_accepted": ["PCB"],
        "authorization_ref_no": "REF-PUBLIC-1",
        "contact_phone": "+919700000005",
        "offered_rates": {"PCB": 260.0},
        "pickup_available": True,
    })
    recycler_id = recycler_response.json()["recycler_id"]

    response = client.get(f"/verify/{recycler_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["verification_status"] == "pending"
    assert payload["is_valid"] is False
    assert payload["details"] == {"authorization_ref_no": "REF-PUBLIC-1"}
    assert "+919700000005" not in response.text
