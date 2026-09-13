from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import PreferredLanguage, AccountType

class CollectorBase(BaseModel):
    phone_number: str
    display_name: Optional[str] = None
    preferred_language: PreferredLanguage = PreferredLanguage.hi
    operating_locality: str
    account_type: AccountType = AccountType.independent
    parent_shop_id: Optional[str] = None

class CollectorCreate(CollectorBase):
    collector_id: Optional[str] = None

class CollectorResponse(CollectorBase):
    collector_id: str
    created_at: datetime

    class Config:
        from_attributes = True
