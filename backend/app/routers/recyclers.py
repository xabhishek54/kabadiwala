from typing import List, Optional
import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recycler import Recycler
from app.models.enums import AuthorizationStatus, MaterialCategory
from app.schemas.recycler import RecyclerCreate, RecyclerResponse, RecyclerMatchResponse

router = APIRouter(prefix="/recyclers", tags=["recyclers"])

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("", response_model=RecyclerResponse, status_code=status.HTTP_201_CREATED)
def register_recycler(payload: RecyclerCreate, db: Session = Depends(get_db)):
    recycler_data = payload.dict(exclude_unset=True)
    # New self-registered recyclers start as pending
    recycler = Recycler(**recycler_data)
    db.add(recycler)
    db.commit()
    db.refresh(recycler)
    return recycler

@router.get("", response_model=List[RecyclerResponse])
def list_recyclers(
    status_filter: Optional[AuthorizationStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Recycler)
    if status_filter:
        query = query.filter(Recycler.authorization_status == status_filter)
    return query.offset(skip).limit(limit).all()

@router.get("/{recycler_id}", response_model=RecyclerResponse)
def get_recycler(recycler_id: str, db: Session = Depends(get_db)):
    recycler = db.query(Recycler).filter(Recycler.recycler_id == recycler_id).first()
    if not recycler:
        raise HTTPException(status_code=404, detail="Recycler not found")
    return recycler

@router.patch("/{recycler_id}/verify", response_model=RecyclerResponse)
def update_authorization_status(
    recycler_id: str,
    status_value: AuthorizationStatus,
    db: Session = Depends(get_db)
):
    recycler = db.query(Recycler).filter(Recycler.recycler_id == recycler_id).first()
    if not recycler:
        raise HTTPException(status_code=404, detail="Recycler not found")

    recycler.authorization_status = status_value
    db.commit()
    db.refresh(recycler)
    return recycler

@router.get("/match/rank", response_model=List[RecyclerMatchResponse])
def match_recyclers(
    category: MaterialCategory,
    lat: float,
    lng: float,
    w1: float = 0.40,
    w2: float = 0.35,
    w3: float = 0.15,
    w4: float = 0.10,
    db: Session = Depends(get_db)
):
    # HARD FILTER: Only verified recyclers are considered per spec
    verified_recyclers = db.query(Recycler).filter(
        Recycler.authorization_status == AuthorizationStatus.verified
    ).all()

    matches = []
    category_str = category.value

    # Find max rate offered for normalization
    all_rates = []
    for r in verified_recyclers:
        rates_dict = r.offered_rates or {}
        if category_str in rates_dict:
            all_rates.append(rates_dict[category_str])
        elif category_str in (r.materials_accepted or []):
            all_rates.append(50.0)  # default nominal rate if accepted but unlisted

    max_rate = max(all_rates) if all_rates else 1.0

    for recycler in verified_recyclers:
        accepted = recycler.materials_accepted or []
        if category_str not in accepted and category_str not in (recycler.offered_rates or {}):
            continue

        dist = haversine_distance(lat, lng, recycler.facility_lat, recycler.facility_lng)
        if dist > recycler.service_radius_km * 2.0:
            continue

        # Proximity score decay
        proximity_score = max(0.0, 1.0 - (dist / max(1.0, recycler.service_radius_km)))
        rate_val = (recycler.offered_rates or {}).get(category_str, 50.0)
        rate_score = min(1.0, rate_val / max(1.0, max_rate))
        pickup_score = 1.0 if recycler.pickup_available else 0.0
        auth_score = 1.0  # Already verified

        score = (w1 * proximity_score) + (w2 * rate_score) + (w3 * pickup_score) + (w4 * auth_score)

        matches.append(RecyclerMatchResponse(
            recycler=RecyclerResponse.from_orm(recycler),
            distance_km=round(dist, 2),
            score=round(score, 4),
            rate_for_category=rate_val,
            pickup_available=recycler.pickup_available
        ))

    matches.sort(key=lambda m: m.score, reverse=True)
    return matches[:5]
