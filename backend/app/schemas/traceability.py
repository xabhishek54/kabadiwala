from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import TransactionStatus, EventActor

class TraceabilityEventBase(BaseModel):
    lot_id: str
    event_type: TransactionStatus
    actor: EventActor
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    photo_ref: Optional[str] = None
    handover_reference_no: Optional[str] = None
    recycler_confirmation: bool = False
    notes: Optional[str] = None

class TraceabilityEventCreate(TraceabilityEventBase):
    event_id: Optional[str] = None

class TraceabilityEventResponse(TraceabilityEventBase):
    event_id: str
    timestamp: datetime

    class Config:
        from_attributes = True
