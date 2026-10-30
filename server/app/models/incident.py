from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class ActiveIncident(Base):
    __tablename__ = "active_incidents"

    incident_id = Column(String(50), primary_key=True)  # e.g. INC-2026-091
    title = Column(String(255), nullable=False)
    service = Column(String(100), nullable=False)
    building = Column(String(100), nullable=True)
    scope = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="high")
    status = Column(String(30), nullable=False, default="active")  # active, investigating, mitigated, resolved
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    ticket_links = relationship("TicketIncidentLink", back_populates="incident", cascade="all, delete-orphan")


class TicketIncidentLink(Base):
    __tablename__ = "ticket_incident_links"

    link_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(50), ForeignKey("active_incidents.incident_id", ondelete="CASCADE"), nullable=False, index=True)
    linked_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket")
    incident = relationship("ActiveIncident", back_populates="ticket_links")

