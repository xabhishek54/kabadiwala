import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import MaterialCategory, MaterialCondition, MaterialSource

class Material(Base):
    __tablename__ = "materials"

    lot_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    material_category = Column(Enum(MaterialCategory), nullable=False)
    sub_category = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    image_ref = Column(String(255), nullable=True)
    approx_weight_kg = Column(Float, nullable=False)
    condition = Column(Enum(MaterialCondition), nullable=False, default=MaterialCondition.intact)
    condition_confidence = Column(Float, nullable=True)
    condition_ml_used = Column(Boolean, default=False)
    source_type = Column(Enum(MaterialSource), nullable=False, default=MaterialSource.household)
    estimated_value = Column(Float, nullable=False)
    collector_id = Column(String(36), ForeignKey("collectors.collector_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    classifier_confidence = Column(Float, nullable=True)
    classifier_used = Column(Boolean, default=False)

    collector = relationship("Collector", backref="materials")
