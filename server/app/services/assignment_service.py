"""
Deterministic Technician Assignment Service.

Allocation is driven by what each technician is skilled in (category + subcategory) and whether
they are currently free. A technician with no matching skill, who is offline, or who already has
`TECH_MAX_ACTIVE_TASKS` active tasks is never chosen automatically. If nobody qualifies the ticket
stays QUEUED and is dispatched as soon as a matching technician frees up.
"""

import logging
from typing import Optional
from datetime import datetime, timezone
from app.repositories.technicians import technicians_repo
from app.schemas.queue import AssignmentDecision

logger = logging.getLogger(__name__)


class AssignmentService:
    @staticmethod
    async def assign_technician(
        ticket_id: str,
        category: str,
        building: Optional[str] = None,
        priority: str = "P3",
        subcategory: Optional[str] = None,
    ) -> AssignmentDecision:
        candidates = await technicians_repo.get_eligible_technicians(
            category=category,
            building=building,
            priority=priority,
            subcategory=subcategory,
        )

        if not candidates:
            return AssignmentDecision(
                ticket_id=ticket_id,
                technician_id=None,
                technician_name=None,
                team_id=None,
                assigned_at=None,
                status="UNASSIGNED",
                reason=(
                    f"No active technician with a free slot is skilled in {category}"
                    f"{' / ' + subcategory if subcategory else ''}. Ticket stays queued until one frees up."
                ),
            )

        selected = candidates[0]
        skill = f"{selected['specialty_category']} / {subcategory}" if selected["subcategory_match"] else (
            f"{selected['specialty_category']} (category match only)"
        )
        return AssignmentDecision(
            ticket_id=ticket_id,
            technician_id=selected["technician_id"],
            technician_name=selected["name"],
            team_id=f"team-{category.lower().replace('/', '-').replace(' ', '-')}",
            assigned_at=datetime.now(timezone.utc),
            status="ASSIGNED",
            reason=f"Skilled in {skill}; {selected['active_workload']} active task(s); match score {selected['match_score']}",
        )

    @classmethod
    async def dispatch_waiting(cls, limit: int = 20) -> list[str]:
        """
        Give queued, unassigned tickets (highest score first) to technicians who now have capacity.
        Called whenever a technician frees up (work report submitted, resolution confirmed).
        Returns the ids of tickets that were dispatched.
        """
        from app.repositories.tickets import tickets_repo

        dispatched: list[str] = []
        for waiting in await tickets_repo.list_unassigned_queued(limit):
            decision = await cls.assign_technician(
                ticket_id=waiting["ticket_id"],
                category=waiting["category"],
                building=waiting["building"],
                priority=waiting["priority"] or "P3",
                subcategory=waiting["subcategory"],
            )
            if decision.status == "ASSIGNED" and decision.technician_id:
                await tickets_repo.assign_technician(
                    waiting["ticket_id"], decision.technician_id, actor="Auto Dispatcher"
                )
                from app.services import email_notifications

                email_notifications.queue_assigned_mail(waiting["ticket_id"], decision.technician_name, waiting["priority"])
                dispatched.append(waiting["ticket_id"])
        if dispatched:
            logger.info("Auto-dispatched queued tickets: %s", dispatched)
        return dispatched


assignment_service = AssignmentService()
