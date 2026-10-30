import logging
from typing import Any
from sqlalchemy import select
from app.config import settings
from app.db.session import get_db_session
from app.models.incident import ActiveIncident, TicketIncidentLink


logger = logging.getLogger(__name__)


class IncidentsRepository:
    async def get_active_incidents(
        self,
        service: str | None = None,
        building: str | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch active facility incidents matching service or building."""
        try:
            with get_db_session() as session:
                stmt = select(ActiveIncident).where(ActiveIncident.status.in_(["active", "investigating"]))
                if service:
                    stmt = stmt.where(ActiveIncident.service.ilike(f"%{service}%"))
                if building:
                    stmt = stmt.where(ActiveIncident.building.ilike(f"%{building}%"))

                rows = session.execute(stmt).scalars().all()
                if rows:
                    return [
                        {
                            "incident_id": r.incident_id,
                            "service": r.service,
                            "title": r.title,
                            "building": r.building or "Main Facility",
                            "scope": r.scope,
                            "severity": r.severity,
                            "status": r.status,
                            "created_at": r.created_at.isoformat() if r.created_at else None,
                        }
                        for r in rows
                    ]
        except Exception:
            logger.exception("Active incident lookup failed")
            if not settings.ALLOW_MEMORY_FALLBACK:
                raise

        # Fallback seeded list (development only)
        return [
            {
                "incident_id": "INC-2026-091",
                "service": "Corporate Wi-Fi",
                "title": "Wi-Fi AP Flapping in Exam Complex",
                "building": "Examination Complex",
                "scope": "Complex-wide access point dropouts during midterm exam period",
                "severity": "high",
                "status": "active",
                "created_at": "2026-10-29T08:00:00Z",
            },
            {
                "incident_id": "INC-2026-092",
                "service": "Fiber Core",
                "title": "Underground Fiber Cut",
                "building": "Science Block",
                "scope": "Underground fiber switch line repair in progress",
                "severity": "critical",
                "status": "active",
                "created_at": "2026-10-29T07:30:00Z",
            },
        ]

    async def link_ticket_to_incident(self, ticket_id: int, incident_id: str) -> None:
        """Link ticket to a shared major incident."""
        with get_db_session() as session:
            existing = session.execute(
                select(TicketIncidentLink).where(
                    TicketIncidentLink.ticket_id == ticket_id,
                    TicketIncidentLink.incident_id == incident_id,
                )
            ).scalar_one_or_none()
            if not existing:
                link = TicketIncidentLink(ticket_id=ticket_id, incident_id=incident_id)
                session.add(link)
                session.commit()


incidents_repo = IncidentsRepository()

