from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class TicketAssignment(Base):
    __tablename__ = "ticket_assignments"

    assignment_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False, index=True)
    technician_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    assignment_status = Column(String(30), nullable=False, default="assigned")  # assigned, accepted, completed, reassigned
    reassignment_reason = Column(Text, nullable=True)

    ticket = relationship("Ticket", back_populates="assignments")
    technician = relationship("User", foreign_keys=[technician_user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])

