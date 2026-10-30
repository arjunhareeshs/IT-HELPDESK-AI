from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.schemas.ticket import TicketRead
from app.services.ticket_service import ticket_service
from app.services.triage_service import triage_service
from app.repositories.tickets import tickets_repo

router = APIRouter(prefix="/triage", tags=["Triage"])


class OverridePriorityRequest(BaseModel):
    priority: str
    reason: str


@router.post("/sweep", status_code=202)
async def sweep_unfinished_triage(background_tasks: BackgroundTasks, limit: int = 20):
    """Retry triage for tickets that never completed it (processed one at a time, each in isolation)."""
    ids = await tickets_repo.list_untriaged_ticket_ids(max(1, min(limit, 100)))

    async def run() -> None:
        for tid in ids:
            await triage_service.triage_ticket_safe(tid)

    background_tasks.add_task(run)
    return {"queued_ticket_ids": ids}


@router.post("/{ticket_id}/override", response_model=TicketRead)
async def override_priority(ticket_id: str, payload: OverridePriorityRequest):
    """Administrator override of ticket priority and severity."""
    try:
        updated = await ticket_service.override_priority(
            ticket_id=ticket_id,
            priority=payload.priority,
            reason=payload.reason,
            actor="Administrator Override"
        )
        return updated
    except ValueError as e:
        code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Priority override failed: {str(e)}")
