import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Enum, DateTime, JSON
from app.database import Base
from app.models.enums import AuthorizationStatus

class Recycler(Base):
    __tablename__ = "recyclers"

    recycler_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    facility_lat = Column(Float, nullable=False)
    facility_lng = Column(Float, nullable=False)
    service_radius_km = Column(Float, nullable=False, default=25.0)
    materials_accepted = Column(JSON, nullable=False)  # List of strings e.g. ["PCB", "BATTERY"]
    authorization_status = Column(Enum(AuthorizationStatus), default=AuthorizationStatus.pending, nullable=False, index=True)
    authorization_ref_no = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    offered_rates = Column(JSON, nullable=False)  # Dict e.g. {"PCB": 250.0, "BATTERY": 85.0}
    pickup_available = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
