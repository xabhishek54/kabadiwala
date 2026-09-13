from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recycler import Recycler
from app.models.enums import AuthorizationStatus, MaterialCategory
from app.schemas.recycler import RecyclerCreate, RecyclerResponse, RecyclerMatchResponse
from app.services.matching_engine import haversine_distance, compute_blended_matching_score

router = APIRouter(prefix="/recyclers", tags=["recyclers"])

@router.post("", response_model=RecyclerResponse, status_code=status.HTTP_201_CREATED)
def register_recycler(payload: RecyclerCreate, db: Session = Depends(get_db)):
    recycler_data = payload.dict(exclude_unset=True)
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
    alpha: float = 0.70,
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
            all_rates.append(50.0)

    max_rate = max(all_rates) if all_rates else 1.0

    for recycler in verified_recyclers:
        accepted = recycler.materials_accepted or []
        if category_str not in accepted and category_str not in (recycler.offered_rates or {}):
            continue

        dist = haversine_distance(lat, lng, recycler.facility_lat, recycler.facility_lng)
        if dist > recycler.service_radius_km * 2.0:
            continue

        rate_val = (recycler.offered_rates or {}).get(category_str, 50.0)

        # Compute blended score (70% deterministic + 30% ML logistic regression completion probability)
        blended_score, s_det, p_comp = compute_blended_matching_score(
            offered_price=rate_val,
            max_rate=max_rate,
            distance_km=dist,
            max_distance_km=recycler.service_radius_km,
            pickup_available=recycler.pickup_available,
            alpha=alpha,
            w1=w1, w2=w2, w3=w3, w4=w4
        )

        matches.append(RecyclerMatchResponse(
            recycler=RecyclerResponse.from_orm(recycler),
            distance_km=round(dist, 2),
            score=blended_score,
            rate_for_category=rate_val,
            pickup_available=recycler.pickup_available
        ))

    matches.sort(key=lambda m: m.score, reverse=True)
    return matches[:5]
