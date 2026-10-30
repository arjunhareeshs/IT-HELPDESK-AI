from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, Integer, Numeric, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class CategoryPolicy(Base):
    __tablename__ = "category_policies"

    policy_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    severity_rules = Column(JSONB, nullable=True, default=dict)
    default_priority = Column(String(20), nullable=False, default="P3")
    sla_resolution_hours = Column(Integer, nullable=True, default=24)
    escalation_hours = Column(Integer, nullable=True, default=4)
    policy_version = Column(String(20), nullable=False, default="1.0")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class PriorityPolicy(Base):
    __tablename__ = "priority_policies"

    priority_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    priority_code = Column(String(20), nullable=False, unique=True)  # P1, P2, P3, P4
    response_target_hours = Column(Numeric(6, 2), nullable=False)
    resolution_target_hours = Column(Numeric(6, 2), nullable=False)
    escalation_rules = Column(JSONB, nullable=True, default=dict)
    description = Column(Text, nullable=True)

