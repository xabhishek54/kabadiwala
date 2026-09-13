from fastapi import APIRouter, Depends, HTTPException
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

@router.get("/{identifier}", response_model=PublicVerifyResponse)
def public_verify_lookup(identifier: str, db: Session = Depends(get_db)):
    # 1. Try finding as a Lot ID
    material = db.query(Material).filter(Material.lot_id == identifier).first()
    if material:
        tx = db.query(Transaction).filter(Transaction.lot_id == material.lot_id).first()
        collector = db.query(Collector).filter(Collector.collector_id == material.collector_id).first()
        active_auth = db.query(CollectionAuthorization).filter(
            CollectionAuthorization.collector_id == material.collector_id,
            CollectionAuthorization.status == CollectionAuthStatus.active
        ).first() if material.collector_id else None

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
                "estimated_value": material.estimated_value,
                "collector_locality": collector.operating_locality if collector else "Pune",
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
                "materials_accepted": recycler.materials_accepted,
                "service_radius_km": recycler.service_radius_km,
                "pickup_available": recycler.pickup_available,
            }
        )

    # 3. Try finding as a Collection Authorization ID
    auth_obj = db.query(CollectionAuthorization).filter(
        CollectionAuthorization.authorization_id == identifier
    ).first()

    if auth_obj:
        is_valid = auth_obj.status == CollectionAuthStatus.active
        return PublicVerifyResponse(
            type="collection_agent",
            id=auth_obj.authorization_id,
            name_or_title=f"Authorized Agent for {auth_obj.recycler.name}",
            verification_status=auth_obj.status.value,
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

        is_valid = active_auth is not None
        issuing_name = active_auth.recycler.name if active_auth else "None"
        return PublicVerifyResponse(
            type="collector",
            id=collector.collector_id,
            name_or_title=collector.display_name or f"Collector ({collector.operating_locality})",
            verification_status="active" if is_valid else "unverified",
            is_valid=is_valid,
            details={
                "operating_locality": collector.operating_locality,
                "account_type": collector.account_type.value,
                "authorized_by": issuing_name,
            }
        )

    raise HTTPException(
        status_code=404,
        detail="No matching record found for the provided identifier."
    )
