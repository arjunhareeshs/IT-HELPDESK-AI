from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class TicketCaseMemory(Base):
    __tablename__ = "ticket_case_memory"

    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), primary_key=True)
    established_facts = Column(JSONB, nullable=True, default=list)
    contradictions_detected = Column(JSONB, nullable=True, default=list)
    missing_facts = Column(JSONB, nullable=True, default=list)
    evidence_references = Column(JSONB, nullable=True, default=list)
    schema_version = Column(String(20), nullable=True, default="1.0")
    last_triaged_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="case_memory")

