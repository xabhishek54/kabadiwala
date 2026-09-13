from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import TransactionStatus, PaymentMethod, PaymentStatus

class TransactionBase(BaseModel):
    collector_id: str
    recycler_id: Optional[str] = None
    status: TransactionStatus = TransactionStatus.draft
    quoted_price: Optional[float] = None
    final_sale_value: Optional[float] = None
    payment_method: PaymentMethod = PaymentMethod.cash
    payment_status: PaymentStatus = PaymentStatus.unpaid
    collection_lat: Optional[float] = None
    collection_lng: Optional[float] = None
    handover_lat: Optional[float] = None
    handover_lng: Optional[float] = None

class TransactionCreate(TransactionBase):
    lot_id: str

class TransactionResponse(TransactionBase):
    lot_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
