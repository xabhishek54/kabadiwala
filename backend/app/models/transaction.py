import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import TransactionStatus, PaymentMethod, PaymentStatus

class Transaction(Base):
    __tablename__ = "transactions"

    lot_id = Column(String(36), ForeignKey("materials.lot_id"), primary_key=True)
    collector_id = Column(String(36), ForeignKey("collectors.collector_id"), nullable=False)
    recycler_id = Column(String(36), ForeignKey("recyclers.recycler_id"), nullable=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.draft, nullable=False, index=True)
    quoted_price = Column(Float, nullable=True)
    final_sale_value = Column(Float, nullable=True)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.cash, nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid, nullable=False)
    collection_lat = Column(Float, nullable=True)
    collection_lng = Column(Float, nullable=True)
    handover_lat = Column(Float, nullable=True)
    handover_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    material = relationship("Material", backref="transaction")
    collector = relationship("Collector", backref="transactions")
    recycler = relationship("Recycler", backref="transactions")
