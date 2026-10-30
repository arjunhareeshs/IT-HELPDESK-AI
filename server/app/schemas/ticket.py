from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field


TicketStatusType = Literal[
    "RECEIVED",
    "AI_PENDING",
    "TRIAGED",
    "QUEUED",
    "NEEDS_HUMAN_REVIEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLUTION_SUBMITTED",
    "USER_VERIFICATION",
    "RESOLVED",
    "REWORK_REQUESTED",
    "TRIAGE_FAILED",
]

PriorityType = Literal["P1", "P2", "P3", "P4"]
SeverityType = Literal["critical", "high", "medium", "low", "unknown"]


class TicketCreate(BaseModel):
    complaint_text: str = Field(min_length=5, max_length=5000)
    building: str = Field(min_length=2, max_length=100)
    complainant_name: str = Field(default="Complainant", min_length=2, max_length=100)
    complainant_id: str = Field(default="user-anonymous", min_length=2, max_length=100)
    college_id: str = Field(default="default-org", max_length=50)
    affected_service: str | None = None
    attachment_keys: list[str] = Field(default_factory=list)


class TimelineItem(BaseModel):
    timestamp: str
    status: str
    actor: str
    note: str | None = None


class AttachmentItem(BaseModel):
    attachment_id: str
    ticket_id: str
    attachment_type: str = "complaint"  # complaint, diagnostic, resolution
    file_name: str
    mime_type: str
    file_size_bytes: int
    url: str
    created_at: str | None = None


class TicketRead(BaseModel):
    ticket_id: str
    created_at: datetime
    complaint_text: str
    complainant_name: str
    complainant_id: str
    building: str
    college_id: str
    status: str
    predicted_category: str | None = None
    predicted_subcategory: str | None = None
    classification_confidence: float | None = None
    severity: SeverityType | None = None
    priority: PriorityType | None = None
    priority_score: float | None = None
    queued_at: datetime | None = None
    urgency: str | None = None
    impact_scope: str | None = None
    severity_confidence: str | None = None
    service_impact: str | None = None
    evidence: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    reasoning_summary: str | None = None
    recommended_next_step: str | None = None
    requires_human_review: bool | None = None
    assigned_technician_id: str | None = None
    assigned_technician_name: str | None = None
    action_notes: str | None = None
    action_images: list[str] = Field(default_factory=list)
    attachments: list[AttachmentItem] = Field(default_factory=list)
    reference_images: list[AttachmentItem] = Field(default_factory=list)
    resolution_confirmed_at: datetime | None = None
    re_evaluation_reason: str | None = None
    timeline: list[TimelineItem] = Field(default_factory=list)
