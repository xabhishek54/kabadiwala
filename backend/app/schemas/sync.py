from typing import List, Any, Dict, Optional
from pydantic import BaseModel

class SyncItem(BaseModel):
    client_uuid: str
    entity_type: str  # "material", "transaction", "traceability_event", "price_observation"
    action: str = "upsert"  # "upsert", "create"
    payload: Dict[str, Any]
    client_timestamp: str

class SyncPushRequest(BaseModel):
    collector_id: str
    items: List[SyncItem]

class SyncPushResponseItem(BaseModel):
    client_uuid: str
    status: str  # "synced", "rejected", "conflict"
    error: Optional[str] = None

class SyncPushResponse(BaseModel):
    processed: int
    results: List[SyncPushResponseItem]

class SyncPullResponse(BaseModel):
    server_timestamp: str
    prices: List[Dict[str, Any]]
    recyclers: List[Dict[str, Any]]
