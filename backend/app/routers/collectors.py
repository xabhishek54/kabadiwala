from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.collector import Collector
from app.models.enums import AccountType
from app.schemas.collector import CollectorResponse

router = APIRouter(prefix="/collectors", tags=["collectors"])

class LinkShopRequest(BaseModel):
    feriwala_collector_id: str
    shop_code: str

class LinkShopResponse(BaseModel):
    status: str
    shop_name: str
    shop_code: str
    parent_shop_id: str

# NOTE: Specific routes MUST come before the /{collector_id} wildcard
@router.get("/shop/{shop_code}/feriwalas", response_model=List[CollectorResponse])
def get_shop_linked_feriwalas(shop_code: str, db: Session = Depends(get_db)):
    code = shop_code.strip().upper()
    shop = db.query(Collector).filter(Collector.shop_code == code).first()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop with code '{code}' not found")

    sub_collectors = db.query(Collector).filter(Collector.parent_shop_id == shop.collector_id).all()
    return sub_collectors

@router.post("/link-shop", response_model=LinkShopResponse)
def link_feriwala_to_shop(payload: LinkShopRequest, db: Session = Depends(get_db)):
    code = payload.shop_code.strip().upper()

    # Search for shop by shop_code
    shop = db.query(Collector).filter(
        Collector.shop_code == code,
        Collector.account_type == AccountType.shop
    ).first()

    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid Shop Code '{code}'. No verified shop found with this code."
        )

    # Get feriwala collector record
    feriwala = db.query(Collector).filter(Collector.collector_id == payload.feriwala_collector_id).first()
    if not feriwala:
        # Create feriwala profile on the fly if needed
        feriwala = Collector(
            collector_id=payload.feriwala_collector_id,
            phone_number=f"98{payload.feriwala_collector_id[-8:]}",
            display_name="Feriwala Collector",
            operating_locality=shop.operating_locality,
            account_type=AccountType.sub_collector,
            parent_shop_id=shop.collector_id,
        )
        db.add(feriwala)
    else:
        feriwala.parent_shop_id = shop.collector_id
        feriwala.account_type = AccountType.sub_collector

    db.commit()

    return LinkShopResponse(
        status="linked",
        shop_name=shop.display_name or "Ganesh Kabadi Shop",
        shop_code=shop.shop_code,
        parent_shop_id=shop.collector_id,
    )

# Wildcard route last — catches any collector_id
@router.get("/{collector_id}", response_model=CollectorResponse)
def get_collector_profile(collector_id: str, db: Session = Depends(get_db)):
    collector = db.query(Collector).filter(Collector.collector_id == collector_id).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector profile not found")
    return collector
