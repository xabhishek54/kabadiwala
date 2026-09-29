from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recycler import Recycler
from app.models.collector import Collector
from app.models.collection_authorization import CollectionAuthorization
from app.models.enums import AuthorizationStatus, CollectionAuthStatus
from app.schemas.authorization import CollectionAuthCreate, CollectionAuthResponse
from app.auth import require_auth

router = APIRouter(prefix="/authorizations", tags=["authorizations"], dependencies=[Depends(require_auth)])

@router.post("", response_model=CollectionAuthResponse, status_code=status.HTTP_201_CREATED)
def issue_collection_authorization(payload: CollectionAuthCreate, db: Session = Depends(get_db)):
    expires_at = payload.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Authorization expiry must be in the future")

    recycler = db.query(Recycler).filter(Recycler.recycler_id == payload.recycler_id).first()
    if not recycler:
        raise HTTPException(status_code=404, detail="Issuing Recycler not found")

    if recycler.authorization_status != AuthorizationStatus.verified:
        raise HTTPException(
            status_code=400,
            detail="Only verified recyclers can issue collection authorizations",
        )

    collector = db.query(Collector).filter(Collector.collector_id == payload.collector_id).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector not found")

    auth_data = payload.model_dump(exclude_unset=True)
    auth_obj = CollectionAuthorization(**auth_data)
    db.add(auth_obj)
    db.commit()
    db.refresh(auth_obj)
    return auth_obj

@router.post("/{authorization_id}/revoke", response_model=CollectionAuthResponse)
def revoke_collection_authorization(authorization_id: str, db: Session = Depends(get_db)):
    auth_obj = db.query(CollectionAuthorization).filter(
        CollectionAuthorization.authorization_id == authorization_id
    ).first()
    if not auth_obj:
        raise HTTPException(status_code=404, detail="Collection authorization not found")

    auth_obj.status = CollectionAuthStatus.revoked
    auth_obj.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(auth_obj)
    return auth_obj

@router.get("/collector/{collector_id}", response_model=List[CollectionAuthResponse])
def get_collector_authorizations(collector_id: str, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    authorizations = db.query(CollectionAuthorization).filter(
        CollectionAuthorization.collector_id == collector_id,
        CollectionAuthorization.status == CollectionAuthStatus.active
    ).all()
    return [
        authorization for authorization in authorizations
        if authorization.expires_at is None
        or (
            authorization.expires_at.replace(tzinfo=timezone.utc)
            if authorization.expires_at.tzinfo is None
            else authorization.expires_at
        ) > now
    ]
