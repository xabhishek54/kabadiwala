from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import MaterialCategory, ObservationUnit, ObservationSource, PriceChannel

class PriceObservationBase(BaseModel):
    material_category: MaterialCategory
    sub_category: str
    location_district: str
    buying_price: float
    quoted_price: Optional[float] = None
    unit: ObservationUnit = ObservationUnit.per_kg
    market_range_low: Optional[float] = None
    market_range_high: Optional[float] = None
    recycler_id: Optional[str] = None
    source: ObservationSource = ObservationSource.manual_admin_entry
    channel: PriceChannel = PriceChannel.formal

class PriceObservationCreate(PriceObservationBase):
    observation_id: Optional[str] = None

class PriceObservationResponse(PriceObservationBase):
    observation_id: str
    observed_at: datetime

    class Config:
        from_attributes = True

class PriceAggregateResponse(BaseModel):
    material_category: MaterialCategory
    sub_category: str
    location_district: str
    current_price: float
    market_range_low: float
    market_range_high: float
    informal_reference_price: Optional[float] = None
    trend_slope: float  # e.g. positive = up, 0 = flat, negative = down
    trend_direction: str  # "up", "flat", "down"
    sample_count: int
