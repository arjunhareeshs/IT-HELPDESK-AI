from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class TicketAIAssessment(Base):
    __tablename__ = "ticket_ai_assessments"

    assessment_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False, index=True)
    classifier_category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    classification_confidence = Column(Numeric(5, 4), nullable=True)
    severity = Column(String(20), nullable=True)
    priority_proposed = Column(String(20), nullable=True)
    priority_confidence_level = Column(String(20), nullable=True)
    priority_confidence_score = Column(Numeric(5, 4), nullable=True)
    urgency = Column(String(30), nullable=True)
    impact_scope = Column(String(30), nullable=True)
    evidence = Column(JSONB, nullable=True, default=list)
    missing_information = Column(JSONB, nullable=True, default=list)
    suggested_fix = Column(Text, nullable=True)
    requires_human_review = Column(Boolean, nullable=True, default=False)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    assessment_json = Column(JSONB, nullable=True)
    status = Column(String(30), nullable=True, default="COMPLETED")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    ticket = relationship("Ticket", back_populates="assessments")

