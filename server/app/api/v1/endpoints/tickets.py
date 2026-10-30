from fastapi import APIRouter, HTTPException, BackgroundTasks, status, Query
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.ticket import TicketCreate, TicketRead
from app.schemas.triage import AIReportResponse
from app.services.ticket_service import ticket_service
from app.services.triage_service import triage_service
from app.repositories.tickets import tickets_repo

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class RetriageRequest(BaseModel):
    reason: Optional[str] = "New evidence or material facts arrived"


class VerifyResolutionRequest(BaseModel):
    verified: bool = True
    comment: Optional[str] = None


class AssignTechnicianRequest(BaseModel):
    technician_id: str
    actor: Optional[str] = "Admin Dispatcher"


class WorkReportRequest(BaseModel):
    action_notes: str
    actor: Optional[str] = "Technician"


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    background_tasks: BackgroundTasks,
    immediate: bool = Query(False, description="If true, execute triage synchronously before returning")
):
    """
    Persist ticket first into database/repository.
    Schedules durable triage job in background (or immediately if requested).
    Returns complete created TicketRead object.
    """
    ticket = await tickets_repo.create_ticket(data)

    if immediate:
        await triage_service.triage_ticket_safe(ticket.ticket_id, ticket.college_id or "default-org")
        updated = await tickets_repo.get_ticket(ticket.ticket_id)
        if updated:
            return updated
    else:
        background_tasks.add_task(triage_service.triage_ticket_safe, ticket.ticket_id, ticket.college_id or "default-org")

    return ticket


@router.get("", response_model=List[TicketRead])
async def list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    raised_by_user_id: Optional[int] = None,
    assigned_to_user_id: Optional[int] = None,
):
    """List all tickets with optional filtering."""
    tickets = await ticket_service.list_tickets(
        raised_by_user_id=raised_by_user_id,
        assigned_to_user_id=assigned_to_user_id,
    )
    if status and status != "all":
        tickets = [t for t in tickets if t.status.lower() == status.lower()]
    if priority and priority != "all":
        tickets = [t for t in tickets if (t.priority or "").lower() == priority.lower() or (t.severity or "").lower() == priority.lower()]
    if category and category != "all":
        tickets = [t for t in tickets if (t.predicted_category or "").lower() == category.lower()]
    if search:
        s = search.lower()
        tickets = [t for t in tickets if s in t.complaint_text.lower() or s in t.ticket_id.lower() or s in t.building.lower()]
    return tickets


@router.get("/{ticket_id}", response_model=TicketRead)
async def get_ticket(ticket_id: str):
    """Retrieve ticket details."""
    ticket = await ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return ticket


@router.get("/{ticket_id}/ai-report", response_model=AIReportResponse)
async def get_ai_report(ticket_id: str):
    """
    Retrieve full AI Triage Report:
    - Structured assessment
    - Tool audit trace
    - Case memory facts
    - Deterministic priority & SLA target
    - Assigned technician
    """
    report = await ticket_service.get_ai_report(ticket_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"AI Report for ticket {ticket_id} not found")
    return report


@router.post("/{ticket_id}/retriage", response_model=AIReportResponse)
async def retriage_ticket(ticket_id: str, payload: RetriageRequest):
    """
    Trigger re-evaluation when new evidence or material incident facts arrive.
    Preserves prior assessments and case facts while computing a new triage run.
    """
    try:
        report = await ticket_service.retriage_ticket(ticket_id, reason=payload.reason)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retriage failed: {str(e)}")


@router.post("/{ticket_id}/re-evaluate", response_model=TicketRead)
async def re_evaluate_alias(ticket_id: str, payload: RetriageRequest):
    """Client alias for ticket re-evaluation."""
    try:
        await ticket_service.retriage_ticket(ticket_id, reason=payload.reason)
        updated = await ticket_service.get_ticket(ticket_id)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-evaluation failed: {str(e)}")


@router.post("/{ticket_id}/verify-resolution", response_model=TicketRead)
async def verify_resolution(ticket_id: str, payload: VerifyResolutionRequest):
    """Record complainant resolution verification or request rework."""
    try:
        updated = await ticket_service.verify_resolution(
            ticket_id=ticket_id,
            verified=payload.verified,
            comment=payload.comment
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/confirm", response_model=TicketRead)
async def confirm_resolution_alias(ticket_id: str):
    """Client alias for confirming resolution."""
    try:
        return await ticket_service.verify_resolution(
            ticket_id=ticket_id,
            verified=True,
            comment="Complainant confirmed resolution."
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/assign", response_model=TicketRead)
async def assign_technician_endpoint(ticket_id: str, payload: AssignTechnicianRequest):
    """Manual technician assignment by administrator/dispatcher."""
    try:
        return await ticket_service.assign_technician(
            ticket_id=ticket_id,
            technician_id=payload.technician_id,
            actor=payload.actor or "Admin Dispatcher"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/work-report", response_model=TicketRead)
async def submit_work_report_endpoint(ticket_id: str, payload: WorkReportRequest):
    """Technician submits work report with troubleshooting notes and fix details."""
    try:
        return await ticket_service.submit_work_report(
            ticket_id=ticket_id,
            action_notes=payload.action_notes,
            actor=payload.actor or "Technician"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
