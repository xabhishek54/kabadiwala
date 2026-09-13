import uuid
from sqlalchemy import Column, String, Float, Enum
from app.database import Base
from app.models.enums import MaterialCategory, MineralEnum

class MineralCompositionFactor(Base):
    __tablename__ = "mineral_composition_factors"

    factor_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    material_category = Column(Enum(MaterialCategory), nullable=False, index=True)
    mineral = Column(Enum(MineralEnum), nullable=False)
    estimated_fraction_per_kg = Column(Float, nullable=False)  # grams per kg
    source_citation = Column(String(255), nullable=False)
