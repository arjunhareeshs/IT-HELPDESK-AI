from typing import Literal
from pydantic import BaseModel, Field


class CategoryPolicyOutput(BaseModel):
    category: str
    allowed_severities: list[str]
    default_priority: str
    policy_version: str
    requires_site_inspection: bool
    escalation_threshold_hours: int
    max_priority: str | None = None
    sla_hours: int | None = None


class RelatedIncidentItem(BaseModel):
    incident_id: str
    service: str
    building: str
    scope: str
    created_at: str


class SimilarTicketItem(BaseModel):
    ticket_id: str
    category: str
    subcategory: str | None = None
    building: str | None = None
    verified: bool = True
    similarity_score: float
    summary: str
    verified_resolution: str | None = None


class TechnicianCandidate(BaseModel):
    technician_id: str
    name: str
    specialty_category: str
    availability: bool
    active_workload: int
    match_score: float
    subcategory_match: bool = False
    status: str = "available"  # available | busy | offline


class ReadOnlyQueryArgs(BaseModel):
    table_scope: Literal["ai_ticket_search_v", "ai_resolution_search_v", "category_policies", "technician_skills"]
    sql: str = Field(min_length=10, max_length=1000)
    purpose: str = Field(min_length=3, max_length=200)


class ReadOnlyQueryResult(BaseModel):
    success: bool
    table_scope: str
    row_count: int
    rows: list[dict] = Field(default_factory=list)
    error: str | None = None
