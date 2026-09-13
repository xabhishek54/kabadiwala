from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recycler import Recycler
from app.models.price import PriceObservation
from app.models.mineral_factor import MineralCompositionFactor
from app.models.enums import AuthorizationStatus, MaterialCategory, MineralEnum

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/recyclers/pending", response_model=List[dict])
def list_pending_recyclers(db: Session = Depends(get_db)):
    recyclers = db.query(Recycler).filter(Recycler.authorization_status == AuthorizationStatus.pending).all()
    return [
        {
            "recycler_id": r.recycler_id,
            "name": r.name,
            "authorization_ref_no": r.authorization_ref_no,
            "contact_phone": r.contact_phone,
            "materials_accepted": r.materials_accepted,
            "created_at": r.created_at.isoformat(),
        }
        for r in recyclers
    ]

@router.post("/minerals/seed", status_code=status.HTTP_201_CREATED)
def seed_mineral_composition_factors(db: Session = Depends(get_db)):
    factors_data = [
        # PCBs: Gallium, Indium, Tantalum, Copper
        {"material_category": MaterialCategory.PCB, "mineral": MineralEnum.gallium, "estimated_fraction_per_kg": 0.05, "source_citation": "JNARDDC E-Waste Study 2024"},
        {"material_category": MaterialCategory.PCB, "mineral": MineralEnum.indium, "estimated_fraction_per_kg": 0.02, "source_citation": "JNARDDC E-Waste Study 2024"},
        {"material_category": MaterialCategory.PCB, "mineral": MineralEnum.tantalum, "estimated_fraction_per_kg": 0.15, "source_citation": "JNARDDC E-Waste Study 2024"},
        {"material_category": MaterialCategory.PCB, "mineral": MineralEnum.copper, "estimated_fraction_per_kg": 200.0, "source_citation": "JNARDDC E-Waste Study 2024"},
        # BATTERY: Lithium, Cobalt
        {"material_category": MaterialCategory.BATTERY, "mineral": MineralEnum.lithium, "estimated_fraction_per_kg": 15.0, "source_citation": "Ministry of Mines Critical Minerals 2024"},
        {"material_category": MaterialCategory.BATTERY, "mineral": MineralEnum.cobalt, "estimated_fraction_per_kg": 45.0, "source_citation": "Ministry of Mines Critical Minerals 2024"},
        # MOTOR_MAGNET: Neodymium
        {"material_category": MaterialCategory.MOTOR_MAGNET, "mineral": MineralEnum.neodymium, "estimated_fraction_per_kg": 30.0, "source_citation": "JNARDDC Rare Earth Study 2024"},
        # LCD_PANEL: Indium
        {"material_category": MaterialCategory.LCD_PANEL, "mineral": MineralEnum.indium, "estimated_fraction_per_kg": 0.08, "source_citation": "JNARDDC E-Waste Study 2024"},
    ]

    added = 0
    for fd in factors_data:
        existing = db.query(MineralCompositionFactor).filter(
            MineralCompositionFactor.material_category == fd["material_category"],
            MineralCompositionFactor.mineral == fd["mineral"]
        ).first()
        if not existing:
            f = MineralCompositionFactor(**fd)
            db.add(f)
            added += 1

    db.commit()
    return {"message": "Mineral composition factors seeded successfully", "added": added}

@router.get("/minerals/impact")
def get_critical_minerals_impact(district: Optional[str] = None, db: Session = Depends(get_db)):
    factors = db.query(MineralCompositionFactor).all()

    # Aggregate by mineral
    mineral_totals = {m.value: 0.0 for m in MineralEnum}

    # Fetch materials and calculate weights per category
    from app.models.material import Material
    from app.models.transaction import Transaction

    query = db.query(Material.material_category, func.sum(Material.approx_weight_kg)).group_by(Material.material_category)
    category_weights = dict(query.all())

    for f in factors:
        cat = f.material_category
        weight_kg = category_weights.get(cat, 0.0) or 0.0
        grams_recovered = weight_kg * f.estimated_fraction_per_kg
        mineral_totals[f.mineral.value] += grams_recovered

    return {
        "unit": "grams",
        "district": district or "All India",
        "mineral_estimates": {k: round(v, 2) for k, v in mineral_totals.items() if v > 0},
        "total_e_waste_processed_kg": sum(category_weights.values() or [0.0]),
    }
