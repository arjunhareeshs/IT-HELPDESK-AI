"""
Ticket Service.
Handles ticket lifecycle, persistence coordination, and triggers triage jobs.
"""

from typing import List, Optional
from datetime import datetime, timezone
from app.schemas.ticket import TicketCreate, TicketRead
from app.schemas.triage import AIReportResponse
from app.repositories.tickets import tickets_repo
from app.repositories.technicians import technicians_repo
from app.services.triage_service import triage_service
from app.services.priority_policy import PRIORITY_SLA_MAP
from app.services.assignment_service import assignment_service
from app.services import email_notifications


class TicketService:
    async def create_ticket(
        self,
        data: TicketCreate,
        run_immediate_triage: bool = True
    ) -> TicketRead:
        ticket = await tickets_repo.create_ticket(data)

        if run_immediate_triage:
            try:
                await triage_service.triage_ticket(ticket.ticket_id, ticket.college_id or "default-org")
                updated = await tickets_repo.get_ticket(ticket.ticket_id)
                if updated:
                    return updated
            except Exception as e:
                tickets_repo.add_ticket_event(
                    ticket.ticket_id,
                    "TRIAGE_FAILED",
                    f"Triage execution error: {str(e)}"
                )

        return ticket

    async def get_ticket(self, ticket_id: str) -> Optional[TicketRead]:
        return await tickets_repo.get_ticket(ticket_id)

    async def list_tickets(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        building: Optional[str] = None,
        category: Optional[str] = None,
        raised_by_user_id: Optional[int] = None,
        assigned_to_user_id: Optional[int] = None,
    ) -> List[TicketRead]:
        return await tickets_repo.list_tickets(
            status=status,
            priority=priority,
            building=building,
            category=category,
            raised_by_user_id=raised_by_user_id,
            assigned_to_user_id=assigned_to_user_id,
        )

    async def get_ai_report(self, ticket_id: str) -> Optional[AIReportResponse]:
        ticket = await tickets_repo.get_ticket(ticket_id)
        if not ticket:
            return None

        assessment = tickets_repo.get_assessment(ticket_id)
        case_mem = await tickets_repo.get_case_memory(ticket_id)

        if not assessment:
            return await triage_service.triage_ticket(ticket_id, ticket.college_id or "default-org")

        return AIReportResponse(
            ticket_id=ticket_id,
            assessment=assessment,
            final_priority=ticket.priority or "P3",
            sla_target_hours=float(PRIORITY_SLA_MAP.get(ticket.priority or "", 24)),
            assigned_technician_id=ticket.assigned_technician_id,
            assigned_technician_name=ticket.assigned_technician_name,
            tool_audit_trace=[],
            case_facts=case_mem.case_facts if case_mem else None
        )

    async def retriage_ticket(self, ticket_id: str, reason: Optional[str] = None) -> AIReportResponse:
        return await triage_service.triage_ticket(
            ticket_id=ticket_id,
            is_retriage=True,
            retriage_reason=reason
        )

    async def verify_resolution(self, ticket_id: str, verified: bool, comment: Optional[str] = None, actor: str = "Complainant") -> TicketRead:
        if verified:
            updated = await tickets_repo.confirm_resolution(ticket_id, actor=actor)
            await assignment_service.dispatch_waiting()
        else:
            updated = await tickets_repo.request_re_evaluation(ticket_id, reason=comment or "Issue not resolved", actor=actor)

        if not updated:
            raise ValueError(f"Ticket {ticket_id} not found")
        return updated

    async def override_priority(self, ticket_id: str, priority: str, reason: str, actor: str = "Administrator") -> TicketRead:
        updated = await tickets_repo.override_priority(ticket_id, priority=priority, reason=reason, actor=actor)
        if not updated:
            raise ValueError(f"Ticket {ticket_id} not found")
        return updated

    async def assign_technician(self, ticket_id: str, technician_id: str, actor: str = "Admin Dispatcher") -> TicketRead:
        updated = await tickets_repo.assign_technician(ticket_id, technician_id=technician_id, actor=actor)
        if not updated:
            raise ValueError(f"Ticket {ticket_id} not found")
        email_notifications.queue_assigned_mail(ticket_id, updated.assigned_technician_name, updated.priority)
        return updated

    async def submit_work_report(self, ticket_id: str, action_notes: str, actor: str = "Technician") -> TicketRead:
        updated = await tickets_repo.submit_work_report(ticket_id, action_notes=action_notes, actor=actor)
        if not updated:
            raise ValueError(f"Ticket {ticket_id} not found")
        # The technician is no longer occupied by this ticket (it now awaits the complainant): hand over queued work.
        await assignment_service.dispatch_waiting()
        return updated


ticket_service = TicketService()
