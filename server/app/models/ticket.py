from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    raised_by_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    assigned_to_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=True, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    priority = Column(String(20), nullable=True, index=True)
    priority_score = Column(Numeric(5, 2), nullable=True, index=True)
    ai_confidence = Column(Numeric(5, 4), nullable=True)
    status = Column(String(30), nullable=False, default="Open", index=True)
    resolution = Column(Text, nullable=True)
    time_to_resolve_hrs = Column(Numeric(10, 2), nullable=True)
    building = Column(String(100), nullable=True)
    college_id = Column(String(50), nullable=True, default="default-org")
    affected_service = Column(String(100), nullable=True)
    re_evaluation_reason = Column(Text, nullable=True)
    queued_at = Column(DateTime(timezone=True), nullable=True, index=True)
    resolution_submitted_at = Column(DateTime(timezone=True), nullable=True)
    resolution_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    complainant = relationship("User", foreign_keys=[raised_by_user_id], backref="raised_tickets")
    assignee = relationship("User", foreign_keys=[assigned_to_user_id], backref="assigned_tickets")
    history_events = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketHistory.created_at.desc()")
    assessments = relationship("TicketAIAssessment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketAIAssessment.created_at.desc()")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    assignments = relationship("TicketAssignment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketAssignment.assigned_at.desc()")
    resolution_attempts = relationship("TicketResolutionAttempt", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketResolutionAttempt.submitted_at.desc()")
    case_memory = relationship("TicketCaseMemory", back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketComment.created_at.asc()")

