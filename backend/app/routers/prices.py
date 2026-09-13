from typing import List, Optional
from datetime import datetime, timedelta, timezone
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.price import PriceObservation
from app.models.enums import MaterialCategory, PriceChannel
from app.schemas.price import PriceObservationCreate, PriceObservationResponse, PriceAggregateResponse
from app.services.pricing_engine import refine_price

router = APIRouter(prefix="/prices", tags=["prices"])


class PriceRefineRequest(BaseModel):
    category: str
    weight_kg: float
    condition: str = "intact"
    district: str = "Pune"


@router.post("/refine")
def refine_price_estimate(payload: PriceRefineRequest, db: Session = Depends(get_db)):
    """
    Refine a lot's price estimate using the server-side GBDT model.
    Returns detailed explainability breakdown for the transparent price UI.
    """
    result = refine_price(
        category=payload.category,
        weight_kg=payload.weight_kg,
        condition=payload.condition,
        district=payload.district,
        db=db,
    )
    return result

@router.post("/observations", response_model=PriceObservationResponse, status_code=status.HTTP_201_CREATED)
def record_price_observation(payload: PriceObservationCreate, db: Session = Depends(get_db)):
    obs_data = payload.dict(exclude_unset=True)
    obs = PriceObservation(**obs_data)
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs

@router.get("/board", response_model=List[PriceAggregateResponse])
def get_price_board(district: str = "Pune", db: Session = Depends(get_db)):
    categories = list(MaterialCategory)
    aggregates = []
    cutoff_14d = datetime.now(timezone.utc) - timedelta(days=14)
    cutoff_28d = datetime.now(timezone.utc) - timedelta(days=28)

    for cat in categories:
        # Get formal observations in district
        query = db.query(PriceObservation).filter(
            PriceObservation.material_category == cat,
            PriceObservation.location_district == district,
            PriceObservation.channel == PriceChannel.formal,
            PriceObservation.observed_at >= cutoff_28d
        )
        obs_list = query.all()
        prices_14d = [o.buying_price for o in obs_list if o.observed_at >= cutoff_14d]

        if not prices_14d:
            # Fallback to all district observations or global default
            all_obs = db.query(PriceObservation).filter(
                PriceObservation.material_category == cat
            ).all()
            prices_14d = [o.buying_price for o in all_obs] or [100.0]

        median_price = float(np.median(prices_14d))
        p25 = float(np.percentile(prices_14d, 25)) if len(prices_14d) > 1 else median_price * 0.9
        p75 = float(np.percentile(prices_14d, 75)) if len(prices_14d) > 1 else median_price * 1.1

        # Informal reference price if available
        informal_obs = db.query(PriceObservation).filter(
            PriceObservation.material_category == cat,
            PriceObservation.location_district == district,
            PriceObservation.channel == PriceChannel.informal
        ).order_by(PriceObservation.observed_at.desc()).first()
        informal_price = informal_obs.buying_price if informal_obs else (median_price * 0.85)

        # Trend slope over 4 weeks
        if len(obs_list) >= 3:
            timestamps = [(o.observed_at - cutoff_28d).total_seconds() / 86400.0 for o in obs_list]
            prices = [o.buying_price for o in obs_list]
            slope = float(np.polyfit(timestamps, prices, 1)[0]) if len(set(timestamps)) > 1 else 0.0
        else:
            slope = 0.0

        trend_dir = "up" if slope > 0.5 else ("down" if slope < -0.5 else "flat")

        aggregates.append(PriceAggregateResponse(
            material_category=cat,
            sub_category=cat.value,
            location_district=district,
            current_price=round(median_price, 2),
            market_range_low=round(p25, 2),
            market_range_high=round(p75, 2),
            informal_reference_price=round(informal_price, 2),
            trend_slope=round(slope, 3),
            trend_direction=trend_dir,
            sample_count=len(prices_14d),
        ))

    return aggregates
