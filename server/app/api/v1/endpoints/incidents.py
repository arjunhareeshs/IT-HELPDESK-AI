from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from app.repositories.incidents import incidents_repo

router = APIRouter(prefix="/incidents", tags=["Incidents"])


class IncidentCreate(BaseModel):
    incident_id: str
    title: str
    service: str
    building: Optional[str] = "Main Facility"
    scope: Optional[str] = None
    severity: Optional[str] = "high"


class IncidentRead(BaseModel):
    incident_id: str
    title: str
    service: str
    building: str
    scope: Optional[str] = None
    severity: str
    status: str
    created_at: Optional[str] = None


@router.get("", response_model=List[IncidentRead])
async def list_incidents(service: Optional[str] = None, building: Optional[str] = None):
    """Retrieve all active incidents for the Incident Registry."""
    return await incidents_repo.get_active_incidents(service=service, building=building)


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
async def create_incident(data: IncidentCreate):
    """Register a new active outage or infrastructure incident."""
    from app.db.session import get_db_session
    from app.models.incident import ActiveIncident

    try:
        with get_db_session() as session:
            inc = ActiveIncident(
                incident_id=data.incident_id,
                title=data.title,
                service=data.service,
                building=data.building,
                scope=data.scope,
                severity=data.severity or "high",
                status="active",
            )
            session.add(inc)
            session.commit()
            return IncidentRead(
                incident_id=inc.incident_id,
                title=inc.title,
                service=inc.service,
                building=inc.building or "Main Facility",
                scope=inc.scope,
                severity=inc.severity,
                status=inc.status,
                created_at=inc.created_at.isoformat() if inc.created_at else None,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

