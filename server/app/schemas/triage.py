from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_type: Literal["complaint", "attachment", "policy", "ticket_record", "service_context"]
    source_id: str | None = None
    observation: str = Field(min_length=1, max_length=500)
    supports: str = Field(min_length=1, max_length=120)


class TriageAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticket_id: str
    category_from_classifier: str
    severity: Literal["critical", "high", "medium", "low", "unknown"]
    urgency: Literal["immediate", "urgent", "normal", "undetermined"]
    impact_scope: Literal["widespread", "multiple_users", "single_user", "unknown"]
    service_impact: str = Field(max_length=800)
    evidence: list[EvidenceItem] = Field(default_factory=list, max_length=10)
    similar_ticket_ids: list[str] = Field(default_factory=list, max_length=5)
    suggested_next_step: str = Field(max_length=500)
    suggested_fix: str | None = Field(default=None, max_length=800)
    missing_information: list[str] = Field(default_factory=list, max_length=10)
    requires_human_review: bool
    confidence_level: Literal["high", "medium", "low"]
    explanation: str = Field(max_length=1000)


class CaseFacts(BaseModel):
    reported_service: str
    observed_impact: str
    confirmed_facts: list[str] = Field(default_factory=list)
    unconfirmed_hypotheses: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    verified_actions_taken: list[str] = Field(default_factory=list)
    latest_ticket_status: str = "AI_PENDING"


class TicketCaseMemory(BaseModel):
    ticket_id: str
    case_facts: CaseFacts
    relevant_record_ids: list[str] = Field(default_factory=list)
    latest_assessment_id: str | None = None
    source_ticket_event_version: int = 0
    updated_at: str | None = None


class AIReportResponse(BaseModel):
    ticket_id: str
    assessment: TriageAssessment
    final_priority: str
    sla_target_hours: float
    assigned_technician_id: str | None
    assigned_technician_name: str | None
    tool_audit_trace: list[dict] = Field(default_factory=list)
    case_facts: CaseFacts
    ml_model_output: str | None = None  # "Category - Subcategory" exactly as the classifier produced it
    priority_score: float | None = None
    queue_position: int | None = None
    queue_position_as_of: str | None = None
