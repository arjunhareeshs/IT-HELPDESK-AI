import asyncio
import logging
from collections import defaultdict
from typing import Any
from sqlalchemy import select
from app.config import settings
from app.db.session import get_db_session
from app.models.user import User
from app.models.technician import TechnicianSkill, TechnicianBuildingAssignment
from app.models.ticket import Ticket
from app.schemas.tool_contracts import TechnicianCandidate

logger = logging.getLogger(__name__)

# A technician is "occupied" by tickets in these statuses. USER_VERIFICATION / RESOLVED free them up.
ACTIVE_TASK_STATUSES = ("ASSIGNED", "IN_PROGRESS", "REWORK_REQUESTED")

# Used only when the database is unreachable and ALLOW_MEMORY_FALLBACK is on (development without a DB).
FALLBACK_TECHNICIANS: list[dict[str, Any]] = [
    {
        "id": "1", "name": "Marcus Chen", "department": "Network Operations",
        "skills": [{"category": "Network", "subcategory": s} for s in ("IP Address", "Wireless", "VPN", "DNS", "DHCP")],
        "assigned_buildings": ["Science Block", "Examination Complex", "Tech Hub A"],
        "active_ticket_ids": [],
    },
    {
        "id": "2", "name": "Sarah Jenkins", "department": "Software & Data Services",
        "skills": [{"category": "Software", "subcategory": s} for s in ("Operating System", "Email")]
        + [{"category": "Database", "subcategory": s} for s in ("DB2", "Oracle", "MS SQL Server")],
        "assigned_buildings": ["Engineering Hall", "Library West"],
        "active_ticket_ids": [],
    },
    {
        "id": "3", "name": "Tariq Al-Mansoor", "department": "Hardware & Helpdesk",
        "skills": [{"category": "Hardware", "subcategory": s} for s in ("CPU", "Disk", "Keyboard", "Memory", "Monitor", "Mouse")]
        + [{"category": "Inquiry/Help", "subcategory": s} for s in ("Internal Application", "Antivirus")],
        "assigned_buildings": ["Operations Tower", "Central Admin"],
        "active_ticket_ids": [],
    },
]


def _finalize(tech: dict[str, Any], is_active: bool = True) -> dict[str, Any]:
    """Derive the fields every consumer relies on from skills + active tasks."""
    skills = tech["skills"]
    categories = list(dict.fromkeys(s["category"] for s in skills))
    workload = len(tech["active_ticket_ids"])
    if not is_active:
        status = "offline"
    elif workload >= settings.TECH_MAX_ACTIVE_TASKS:
        status = "busy"
    else:
        status = "available"
    return {
        **tech,
        "specialties": categories or ["General IT Support"],
        "subcategories": list(dict.fromkeys(s["subcategory"] for s in skills if s["subcategory"])),
        "active_workload": workload,
        "max_active_tasks": settings.TECH_MAX_ACTIVE_TASKS,
        "availability_status": status,
        "available": status == "available",
    }


class TechniciansRepository:
    async def get_all_technicians(self) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._get_all_technicians_sync)

    def _get_all_technicians_sync(self) -> list[dict[str, Any]]:
        """Every technician with skills (category + subcategory), buildings, active tasks and live status."""
        try:
            with get_db_session() as session:
                tech_users = session.execute(
                    select(User).where(User.role.ilike("%technician%")).order_by(User.user_id)  # live schema role: "IT-Technician"
                ).scalars().all()
                ids = [u.user_id for u in tech_users]

                skills: dict[int, list[dict]] = defaultdict(list)
                buildings: dict[int, list[str]] = defaultdict(list)
                active: dict[int, list[str]] = defaultdict(list)
                if ids:
                    for uid, cat, sub in session.execute(
                        select(TechnicianSkill.technician_user_id, TechnicianSkill.category, TechnicianSkill.subcategory)
                        .where(TechnicianSkill.technician_user_id.in_(ids))
                    ):
                        skills[uid].append({"category": cat, "subcategory": sub})
                    for uid, b in session.execute(
                        select(TechnicianBuildingAssignment.technician_user_id, TechnicianBuildingAssignment.building)
                        .where(TechnicianBuildingAssignment.technician_user_id.in_(ids))
                    ):
                        buildings[uid].append(b)
                    for uid, tid in session.execute(
                        select(Ticket.assigned_to_user_id, Ticket.ticket_id)
                        .where(Ticket.assigned_to_user_id.in_(ids), Ticket.status.in_(ACTIVE_TASK_STATUSES))
                        .order_by(Ticket.ticket_id)
                    ):
                        active[uid].append(str(tid))

                return [
                    _finalize(
                        {
                            "id": str(u.user_id),
                            "name": u.full_name,
                            "email": u.email,
                            "department": u.department or "IT Support",
                            "skills": skills[u.user_id],
                            "assigned_buildings": buildings[u.user_id] or ([u.building] if u.building else []),
                            "active_ticket_ids": active[u.user_id],
                        },
                        is_active=bool(u.is_active),
                    )
                    for u in tech_users
                ]
        except Exception:
            logger.exception("Technician lookup failed")
            if not settings.ALLOW_MEMORY_FALLBACK:
                raise
        return [_finalize(dict(t)) for t in FALLBACK_TECHNICIANS]

    async def get_eligible_technicians(
        self,
        category: str,
        building: str | None = None,
        priority: str = "P3",
        subcategory: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Technicians who (a) have a skill in the ticket's category, (b) are active and (c) are not at capacity,
        best match first. A technician without the category skill is never eligible.
        """
        category_l = (category or "").strip().lower()
        sub_l = (subcategory or "").strip().lower()
        candidates = []

        for tech in await self.get_all_technicians():
            if tech["availability_status"] != "available":
                continue
            in_category = [s for s in tech["skills"] if (s["category"] or "").lower() == category_l]
            if not in_category:
                continue

            sub_match = bool(sub_l) and any((s["subcategory"] or "").lower() == sub_l for s in in_category)
            category_wide = any(not s["subcategory"] for s in in_category)

            score = 0.3
            if sub_match:
                score += 0.4
            elif category_wide:
                score += 0.1
            if building and any(building.lower() in b.lower() for b in tech["assigned_buildings"]):
                score += 0.2
            score -= tech["active_workload"] * 0.05

            candidates.append(
                TechnicianCandidate(
                    technician_id=tech["id"],
                    name=tech["name"],
                    specialty_category=in_category[0]["category"],
                    availability=True,
                    active_workload=tech["active_workload"],
                    match_score=max(round(score, 2), 0.05),
                    subcategory_match=sub_match,
                    status=tech["availability_status"],
                ).model_dump()
            )

        # Best match first; on a tie the less-loaded technician, then the lower id (stable, deterministic).
        candidates.sort(key=lambda c: (-c["match_score"], c["active_workload"], c["technician_id"]))
        return candidates


technicians_repo = TechniciansRepository()
