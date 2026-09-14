import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.enums import AccountType
from app.schemas.collector import CollectorCreate, CollectorResponse
from app.schemas.recycler import RecyclerCreate, RecyclerResponse

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    phone_number: str
    role: str = "collector"  # "collector" or "recycler"

class LoginResponse(BaseModel):
    user_id: str
    phone_number: str
    name: str
    role: str
    account_type: Optional[str] = None
    shop_code: Optional[str] = None
    district: Optional[str] = "Pune"

@router.post("/login", response_model=LoginResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    phone = payload.phone_number.strip()

    if payload.role == "recycler":
        recycler = db.query(Recycler).filter(Recycler.contact_phone == phone).first()
        if not recycler:
            # Fallback search if phone starts with or matches
            recycler = db.query(Recycler).filter(Recycler.contact_phone.like(f"%{phone[-10:]}")).first()
        if not recycler:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recycler account not found. Please complete recycler registration."
            )
        return LoginResponse(
            user_id=recycler.recycler_id,
            phone_number=recycler.contact_phone,
            name=recycler.name,
            role="recycler",
            district="Pune",
        )

    else:
        collector = db.query(Collector).filter(Collector.phone_number == phone).first()
        if not collector:
            collector = db.query(Collector).filter(Collector.phone_number.like(f"%{phone[-10:]}")).first()

        if not collector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collector account not found. Please complete setup onboarding."
            )

        return LoginResponse(
            user_id=collector.collector_id,
            phone_number=collector.phone_number,
            name=collector.display_name or "Waste Collector",
            role="collector",
            account_type=collector.account_type.value if collector.account_type else "independent",
            shop_code=collector.shop_code,
            district=collector.operating_locality or "Pune",
        )

@router.post("/signup/collector", response_model=CollectorResponse, status_code=status.HTTP_201_CREATED)
def signup_collector(payload: CollectorCreate, db: Session = Depends(get_db)):
    phone = payload.phone_number.strip()

    existing = db.query(Collector).filter(Collector.phone_number == phone).first()
    if existing:
        return existing

    collector_data = payload.dict(exclude_unset=True)

    # Generate shop_code for shop owners
    if payload.account_type == AccountType.shop and not payload.shop_code:
        while True:
            code = f"SHOP-{random.randint(1000, 9999)}"
            if not db.query(Collector).filter(Collector.shop_code == code).first():
                collector_data["shop_code"] = code
                break

    collector = Collector(**collector_data)
    db.add(collector)
    db.commit()
    db.refresh(collector)
    return collector

@router.post("/signup/recycler", response_model=RecyclerResponse, status_code=status.HTTP_201_CREATED)
def signup_recycler(payload: RecyclerCreate, db: Session = Depends(get_db)):
    phone = payload.contact_phone.strip()

    existing = db.query(Recycler).filter(Recycler.contact_phone == phone).first()
    if existing:
        return existing

    recycler_data = payload.dict(exclude_unset=True)
    recycler = Recycler(**recycler_data)
    db.add(recycler)
    db.commit()
    db.refresh(recycler)
    return recycler
