from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class QueuePositionInfo(BaseModel):
    ticket_id: str
    final_priority: str
    queue_position: int
    queue_position_as_of: datetime = Field(default_factory=datetime.utcnow)
    sla_target_hours: int
    sla_deadline: Optional[datetime] = None

class AssignmentDecision(BaseModel):
    ticket_id: str
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    team_id: Optional[str] = None
    assigned_at: Optional[datetime] = None
    status: str = "ASSIGNED"
    reason: str
