import asyncio
import time
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from app.services.ticket_service import ticket_service
from app.repositories.technicians import technicians_repo
from app.services import analytics_service as svc

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# The dashboard fires ~7 analytics requests at once and all of them need the same ticket list.
# A short single-flight cache means one DB read serves the whole burst.
_TICKETS_TTL_SECONDS = 10.0
_tickets_cache: tuple[float, list] | None = None
_tickets_lock = asyncio.Lock()


async def _refresh_tickets() -> list:
    global _tickets_cache
    async with _tickets_lock:
        cached = _tickets_cache
        if cached and time.monotonic() - cached[0] < 1.0:  # another request just refreshed it
            return cached[1]
        tickets = await ticket_service.list_tickets()
        _tickets_cache = (time.monotonic(), tickets)
        return tickets


async def warm_tickets_cache() -> None:
    """Called at startup so the first dashboard visit is served from memory."""
    try:
        await _refresh_tickets()
    except Exception:
        pass


async def _tickets() -> list:
    """Fresh data is served from memory; stale data is served instantly while a refresh runs behind it."""
    cached = _tickets_cache
    if cached is None:
        return await _refresh_tickets()
    if time.monotonic() - cached[0] >= _TICKETS_TTL_SECONDS and not _tickets_lock.locked():
        asyncio.create_task(_refresh_tickets())
    return cached[1]


class DashboardStats(BaseModel):
    active_tickets: int
    completed_tickets: int
    high_priority_tickets: int
    needs_verification_tickets: int
    open_tickets: int
    critical_high_tickets: int
    resolved_today: int
    sla_at_risk_tickets: int
    last_updated: str


class FlowDataPoint(BaseModel):
    timestamp: str
    label: str
    created: int
    resolved: int
    backlog: int


class SubcategoryCount(BaseModel):
    name: str
    count: int


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    percentage: float
    subcategories: List[SubcategoryCount]


class SeverityCategoryItem(BaseModel):
    category: str
    critical: int
    high: int
    medium: int
    low: int
    overdue: int
    total: int


class ResolutionTimeItem(BaseModel):
    category: str
    median_hours: float
    active_work_hours: float
    waiting_hours: float
    ticket_count: int


class TechnicianStatusBreakdown(BaseModel):
    assigned: int
    in_progress: int
    waiting_user: int
    blocked: int
    overdue: int


class TechnicianWorkloadItem(BaseModel):
    technician_id: str
    name: str
    department: str
    active_tickets: int
    completed_tickets: int
    sla_compliance_percent: Optional[float] = None
    rework_rate_percent: Optional[float] = None
    status_breakdown: TechnicianStatusBreakdown


class SkillPerformanceItem(BaseModel):
    category: str
    tickets_resolved: int
    success_rate_percent: float  # share of resolved tickets never sent back for re-evaluation
    median_resolution_hours: float


class TechnicianMatrixItem(BaseModel):
    technician_id: str
    name: str
    skills: Dict[str, SkillPerformanceItem]


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Live summary metrics for operations dashboard overview cards."""
    tickets = await _tickets()
    return DashboardStats(**svc.dashboard_stats(tickets, datetime.now(timezone.utc)))


@router.get("/ticket-flow", response_model=List[FlowDataPoint])
async def get_ticket_flow(period: str = Query("today", description="hour | today | 7d | 30d")):
    """Graph 1: Incoming vs. Resolved tickets over time."""
    tickets = await _tickets()
    return [FlowDataPoint(**p) for p in svc.ticket_flow(tickets, period, datetime.now(timezone.utc))]


@router.get("/category-breakdown", response_model=List[CategoryBreakdownItem])
async def get_category_breakdown():
    """Graph 2: Interactive category and subcategory issue breakdown."""
    tickets = await _tickets()
    return [CategoryBreakdownItem(**i) for i in svc.category_breakdown(tickets)]


@router.get("/severity-by-category", response_model=List[SeverityCategoryItem])
async def get_severity_by_category():
    """Graph 3: Stacked severity distribution and overdue count by category."""
    tickets = await _tickets()
    return [SeverityCategoryItem(**i) for i in svc.severity_by_category(tickets, datetime.now(timezone.utc))]


@router.get("/resolution-time", response_model=List[ResolutionTimeItem])
async def get_resolution_time(
    building: Optional[str] = None,
    priority: Optional[str] = None,
):
    """Graph 4: Median resolution time, active work time, and waiting time by category."""
    tickets = await _tickets()
    return [ResolutionTimeItem(**i) for i in svc.resolution_time(tickets, building, priority)]


@router.get("/technician-workload", response_model=List[TechnicianWorkloadItem])
async def get_technician_workload():
    """Graph 5 & Graph A: Workforce management workload, SLA compliance and status breakdown."""
    tickets = await _tickets()
    technicians = await technicians_repo.get_all_technicians()
    items = svc.technician_workload(technicians, tickets, datetime.now(timezone.utc))
    return [TechnicianWorkloadItem(**i) for i in items]


@router.get("/technicians/category-matrix", response_model=List[TechnicianMatrixItem])
async def get_technician_category_matrix():
    """Graph C: Technician skill-category performance matrix."""
    tickets = await _tickets()
    technicians = await technicians_repo.get_all_technicians()
    return [TechnicianMatrixItem(**i) for i in svc.technician_category_matrix(technicians, tickets)]
