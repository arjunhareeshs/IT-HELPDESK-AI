from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class NotificationOutbox(Base):
    __tablename__ = "notifications_outbox"

    event_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True)
    notification_type = Column(String(50), nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)
    delivery_status = Column(String(30), nullable=False, default="pending", index=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    sent_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    ticket = relationship("Ticket")
    recipient = relationship("User")

