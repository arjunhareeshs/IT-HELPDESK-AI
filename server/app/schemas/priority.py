from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class UrgencyLevel(str, Enum):
    IMMEDIATE = "immediate"
    URGENT = "urgent"
    NORMAL = "normal"
    UNDETERMINED = "undetermined"


class ImpactScope(str, Enum):
    WIDESPREAD = "widespread"
    MULTIPLE_USERS = "multiple_users"
    SINGLE_USER = "single_user"
    UNKNOWN = "unknown"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SeverityAssessmentInput(BaseModel):
    ticket_id: str = Field(..., description="Unique ticket identifier")
    complaint_text: str = Field(..., description="Raw text of the user's IT complaint")
    predicted_category: str = Field(..., description="Category predicted by ML classifier")
    classification_confidence: Optional[float] = Field(default=None, description="Confidence score from ML classifier")
    building: Optional[str] = Field(default=None, description="Location or building name if specified")
    affected_users: Optional[Union[int, str]] = Field(default=None, description="Number or estimate of affected users")
    affected_service: Optional[str] = Field(default=None, description="Affected IT service or system")
    deadline: Optional[str] = Field(default=None, description="Stated time deadline if provided")
    additional_context: Optional[str] = Field(default=None, description="Any supplementary context")


class SeverityAssessmentOutput(BaseModel):
    severity: SeverityLevel = Field(..., description="Assessed severity level")
    urgency: UrgencyLevel = Field(..., description="Assessed urgency level")
    impact_scope: ImpactScope = Field(..., description="Assessed scope of impact")
    service_impact: str = Field(..., description="Short explanation of operational impact")
    evidence: List[str] = Field(default_factory=list, description="Specific supporting facts from input")
    missing_information: List[str] = Field(default_factory=list, description="Additional facts needed")
    reasoning_summary: str = Field(..., description="Concise explanation of assessment")
    recommended_next_step: str = Field(..., description="Safe, non-executing recommendation")
    requires_human_review: bool = Field(..., description="Whether human review is required")
    confidence_level: ConfidenceLevel = Field(
        ...,
        description="Qualitative estimate of confidence (not a statistically calibrated probability)"
    )
