from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class TicketResolutionAttempt(Base):
    __tablename__ = "ticket_resolution_attempts"

    attempt_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False, index=True)
    technician_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    diagnosis = Column(Text, nullable=True)
    action_taken = Column(Text, nullable=True)
    resolution_summary = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_status = Column(String(30), nullable=True, default="pending")  # pending, confirmed, rejected
    rework_reason = Column(Text, nullable=True)

    ticket = relationship("Ticket", back_populates="resolution_attempts")
    technician = relationship("User", foreign_keys=[technician_user_id])

