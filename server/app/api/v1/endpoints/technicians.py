from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.repositories.technicians import technicians_repo
from app.services.ticket_service import ticket_service
from app.services import analytics_service as svc

router = APIRouter(prefix="/technicians", tags=["Technicians"])


class TechnicianSchema(BaseModel):
    id: str
    name: str
    email: str
    department: str
    is_available: bool
    supported_categories: List[str]
    supported_subcategories: List[str]
    active_tickets_count: int
    completed_tickets_count: int
    on_time_rate_percent: Optional[float] = None
    workload_status: str
    availability_status: str = "available"  # available | busy | offline
    max_active_tasks: int = 5
    active_ticket_ids: List[str] = []
    skills: List[dict] = []  # [{category, subcategory}]


@router.get("", response_model=List[TechnicianSchema])
async def list_technicians():
    """Retrieve full directory of technical specialists with real-time workload status."""
    techs = await technicians_repo.get_all_technicians()
    tickets = await ticket_service.list_tickets()
    by_tech: dict[str, list] = {}
    for t in tickets:
        if t.assigned_technician_id:
            by_tech.setdefault(t.assigned_technician_id, []).append(t)
    now = datetime.now(timezone.utc)
    results = []
    for tech in techs:
        stats = svc.technician_stats(by_tech.get(str(tech["id"]), []), now)
        workload = stats["active_tickets"]
        status = "Normal" if workload < 3 else "High" if workload < 6 else "Overloaded"
        specs = tech.get("specialties", ["General IT Support"])
        results.append(
            TechnicianSchema(
                id=str(tech["id"]),
                name=tech["name"],
                email=tech.get("email") or f"{tech['name'].lower().replace(' ', '.')}@helpdesk.corp",
                department=tech.get("department") or f"{specs[0]} Support",
                is_available=tech.get("available", True),
                availability_status=tech.get("availability_status", "available"),
                max_active_tasks=tech.get("max_active_tasks", 5),
                active_ticket_ids=tech.get("active_ticket_ids", []),
                skills=tech.get("skills", []),
                supported_categories=specs,
                supported_subcategories=tech.get("subcategories", []),
                active_tickets_count=workload,
                completed_tickets_count=stats["completed_tickets"],
                on_time_rate_percent=stats["on_time_rate_percent"],
                workload_status=status,
            )
        )
    return results
