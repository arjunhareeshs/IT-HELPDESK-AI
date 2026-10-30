from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class AIToolCallAudit(Base):
    __tablename__ = "ai_tool_call_audit"

    audit_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="SET NULL"), nullable=True, index=True)
    run_id = Column(String(100), nullable=True)
    tool_name = Column(String(100), nullable=False)
    tool_arguments = Column(JSONB, nullable=True)
    result_reference = Column(JSONB, nullable=True)
    execution_status = Column(String(30), nullable=False)  # success, error, rejected
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket")

