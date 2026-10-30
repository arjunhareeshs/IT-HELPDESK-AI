from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class TicketHistory(Base):
    __tablename__ = "ticket_history"

    history_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=True)
    actor_type = Column(String(30), nullable=True, default="system")
    metadata_ = Column("metadata", JSONB, nullable=True, default=dict)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    ticket = relationship("Ticket", back_populates="history_events")
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])

