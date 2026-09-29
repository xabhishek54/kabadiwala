from collections import deque
from datetime import datetime, timezone
import threading
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recycler import Recycler
from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.collection_authorization import CollectionAuthorization
from app.models.enums import AuthorizationStatus, CollectionAuthStatus
from app.schemas.authorization import PublicVerifyResponse

router = APIRouter(prefix="/verify", tags=["verify"])

_RATE_LIMIT_WINDOW_SECONDS = 60
_RATE_LIMIT_REQUESTS = 60
_request_times: dict[str, deque[float]] = {}
_rate_limit_lock = threading.Lock()

def _enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _rate_limit_lock:
        recent_requests = _request_times.setdefault(client_ip, deque())
        while recent_requests and now - recent_requests[0] >= _RATE_LIMIT_WINDOW_SECONDS:
            recent_requests.popleft()
        if len(recent_requests) >= _RATE_LIMIT_REQUESTS:
            raise HTTPException(status_code=429, detail="Too many verification requests. Try again shortly.")
        recent_requests.append(now)
        if len(_request_times) > 1000:
            expired_ips = [
                ip for ip, requests in _request_times.items()
                if not requests or now - requests[-1] >= _RATE_LIMIT_WINDOW_SECONDS
            ]
            for ip in expired_ips:
                _request_times.pop(ip, None)

def _is_unexpired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return True
    current_time = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at > current_time

@router.get("/{identifier}", response_model=PublicVerifyResponse)
def public_verify_lookup(
    identifier: str,
    request: Request,
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(request)

    # 1. Try finding as a Lot ID
    material = db.query(Material).filter(Material.lot_id == identifier).first()
    if material:
        tx = db.query(Transaction).filter(Transaction.lot_id == material.lot_id).first()
        collector = db.query(Collector).filter(Collector.collector_id == material.collector_id).first()
        active_auth = db.query(CollectionAuthorization).filter(
            CollectionAuthorization.collector_id == material.collector_id,
            CollectionAuthorization.status == CollectionAuthStatus.active
        ).first() if material.collector_id else None
        if active_auth and not _is_unexpired(active_auth.expires_at):
            active_auth = None

        return PublicVerifyResponse(
            type="lot",
            id=material.lot_id,
            name_or_title=f"{material.material_category.value} ({material.approx_weight_kg}kg)",
            verification_status=tx.status.value if tx else "draft",
            is_valid=tx.payment_status.value == "paid" if tx else False,
            details={
                "category": material.material_category.value,
                "sub_category": material.sub_category,
                "approx_weight_kg": material.approx_weight_kg,
                "condition": material.condition.value,
                "is_authorized_agent": active_auth is not None,
                "authorized_by_recycler": active_auth.recycler.name if active_auth else None,
                "created_at": material.created_at.isoformat() if material.created_at else None,
            }
        )

    # 2. Try finding as a Recycler ID or Ref No
    recycler = db.query(Recycler).filter(
        (Recycler.recycler_id == identifier) | (Recycler.authorization_ref_no == identifier)
    ).first()

    if recycler:
        is_verified = recycler.authorization_status == AuthorizationStatus.verified
        return PublicVerifyResponse(
            type="recycler",
            id=recycler.recycler_id,
            name_or_title=recycler.name,
            verification_status=recycler.authorization_status.value,
            is_valid=is_verified,
            details={
                "authorization_ref_no": recycler.authorization_ref_no,
            }
        )

    # 3. Try finding as a Collection Authorization ID
    auth_obj = db.query(CollectionAuthorization).filter(
        CollectionAuthorization.authorization_id == identifier
    ).first()

    if auth_obj:
        is_valid = (
            auth_obj.status == CollectionAuthStatus.active
            and _is_unexpired(auth_obj.expires_at)
        )
        verification_status = (
            "expired" if auth_obj.status == CollectionAuthStatus.active and not is_valid
            else auth_obj.status.value
        )
        return PublicVerifyResponse(
            type="collection_agent",
            id=auth_obj.authorization_id,
            name_or_title=f"Authorized Agent for {auth_obj.recycler.name}",
            verification_status=verification_status,
            is_valid=is_valid,
            details={
                "issued_at": auth_obj.issued_at.isoformat(),
                "expires_at": auth_obj.expires_at.isoformat() if auth_obj.expires_at else None,
                "revoked_at": auth_obj.revoked_at.isoformat() if auth_obj.revoked_at else None,
                "scope_note": auth_obj.scope_note,
                "issuing_recycler_id": auth_obj.recycler_id,
                "issuing_recycler_name": auth_obj.recycler.name,
            }
        )

    # 4. Try finding as a Collector ID with active authorizations
    collector = db.query(Collector).filter(Collector.collector_id == identifier).first()
    if collector:
        active_auth = db.query(CollectionAuthorization).filter(
            CollectionAuthorization.collector_id == collector.collector_id,
            CollectionAuthorization.status == CollectionAuthStatus.active
        ).first()
        if active_auth and not _is_unexpired(active_auth.expires_at):
            active_auth = None

        is_valid = active_auth is not None
        return PublicVerifyResponse(
            type="collector",
            id=collector.collector_id,
            name_or_title="Authorized Collection Agent" if is_valid else "Unverified Collector",
            verification_status="active" if is_valid else "unverified",
            is_valid=is_valid,
            details={
                "scope_note": active_auth.scope_note if active_auth else None,
                "authorized_by_recycler": active_auth.recycler.name if active_auth else None,
            }
        )

    raise HTTPException(
        status_code=404,
        detail="No matching record found for the provided identifier."
    )
