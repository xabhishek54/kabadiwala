import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import CollectionAuthStatus

class CollectionAuthorization(Base):
    __tablename__ = "collection_authorizations"

    authorization_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recycler_id = Column(String(36), ForeignKey("recyclers.recycler_id"), nullable=False, index=True)
    collector_id = Column(String(36), ForeignKey("collectors.collector_id"), nullable=False, index=True)
    status = Column(Enum(CollectionAuthStatus), default=CollectionAuthStatus.active, nullable=False, index=True)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    scope_note = Column(String(255), nullable=True)

    recycler = relationship("Recycler", backref="collection_authorizations")
    collector = relationship("Collector", backref="collection_authorizations")
