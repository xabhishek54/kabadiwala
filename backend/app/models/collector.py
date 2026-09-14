import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import PreferredLanguage, AccountType

class Collector(Base):
    __tablename__ = "collectors"

    collector_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=True)
    preferred_language = Column(Enum(PreferredLanguage), default=PreferredLanguage.hi, nullable=False)
    operating_locality = Column(String(100), nullable=False)
    account_type = Column(Enum(AccountType), default=AccountType.independent, nullable=False)
    shop_code = Column(String(20), unique=True, index=True, nullable=True)
    parent_shop_id = Column(String(36), ForeignKey("collectors.collector_id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    parent_shop = relationship("Collector", remote_side=[collector_id], backref="sub_collectors")
