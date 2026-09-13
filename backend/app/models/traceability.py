import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import TransactionStatus, EventActor

class TraceabilityEvent(Base):
    __tablename__ = "traceability_events"

    event_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lot_id = Column(String(36), ForeignKey("materials.lot_id"), nullable=False, index=True)
    event_type = Column(Enum(TransactionStatus), nullable=False)
    actor = Column(Enum(EventActor), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    photo_ref = Column(String(255), nullable=True)
    handover_reference_no = Column(String(20), nullable=True)
    recycler_confirmation = Column(Boolean, default=False)
    notes = Column(String(500), nullable=True)

    material = relationship("Material", backref="traceability_events")
