from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import AuthorizationStatus

class RecyclerBase(BaseModel):
    name: str
    facility_lat: float
    facility_lng: float
    service_radius_km: float = 25.0
    materials_accepted: List[str]
    authorization_status: AuthorizationStatus = AuthorizationStatus.pending
    authorization_ref_no: str
    contact_phone: str
    offered_rates: Dict[str, float]
    pickup_available: bool = False

class RecyclerCreate(RecyclerBase):
    recycler_id: Optional[str] = None

class RecyclerResponse(RecyclerBase):
    recycler_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RecyclerMatchResponse(BaseModel):
    recycler: RecyclerResponse
    distance_km: float
    score: float
    rate_for_category: float
    pickup_available: bool
