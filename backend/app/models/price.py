import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import MaterialCategory, ObservationUnit, ObservationSource, PriceChannel

class PriceObservation(Base):
    __tablename__ = "price_observations"

    observation_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    material_category = Column(Enum(MaterialCategory), nullable=False)
    sub_category = Column(String(100), nullable=False)
    location_district = Column(String(100), nullable=False, index=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    buying_price = Column(Float, nullable=False)
    quoted_price = Column(Float, nullable=True)
    unit = Column(Enum(ObservationUnit), default=ObservationUnit.per_kg, nullable=False)
    market_range_low = Column(Float, nullable=True)
    market_range_high = Column(Float, nullable=True)
    recycler_id = Column(String(36), ForeignKey("recyclers.recycler_id"), nullable=True)
    source = Column(Enum(ObservationSource), default=ObservationSource.manual_admin_entry, nullable=False)
    channel = Column(Enum(PriceChannel), default=PriceChannel.formal, nullable=False)

    recycler = relationship("Recycler", backref="price_observations")
