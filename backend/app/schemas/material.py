from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import MaterialCategory, MaterialCondition, MaterialSource

class MaterialBase(BaseModel):
    material_category: MaterialCategory
    sub_category: str
    description: Optional[str] = None
    image_ref: Optional[str] = None
    approx_weight_kg: float
    condition: MaterialCondition = MaterialCondition.intact
    condition_confidence: Optional[float] = None
    condition_ml_used: bool = False
    source_type: MaterialSource = MaterialSource.household
    estimated_value: float
    collector_id: str
    classifier_confidence: Optional[float] = None
    classifier_used: bool = False

class MaterialCreate(MaterialBase):
    lot_id: Optional[str] = None

class MaterialResponse(MaterialBase):
    lot_id: str
    created_at: datetime

    class Config:
        from_attributes = True
