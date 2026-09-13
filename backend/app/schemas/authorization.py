from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import CollectionAuthStatus

class CollectionAuthBase(BaseModel):
    recycler_id: str
    collector_id: str
    status: CollectionAuthStatus = CollectionAuthStatus.active
    expires_at: Optional[datetime] = None
    scope_note: Optional[str] = None

class CollectionAuthCreate(CollectionAuthBase):
    authorization_id: Optional[str] = None

class CollectionAuthResponse(CollectionAuthBase):
    authorization_id: str
    issued_at: datetime
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PublicVerifyResponse(BaseModel):
    type: str  # "recycler" or "collection_agent" or "authorization"
    id: str
    name_or_title: str
    verification_status: str  # "verified", "active", "pending", "revoked"
    is_valid: bool
    details: dict
