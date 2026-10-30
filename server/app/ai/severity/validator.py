import logging
from typing import List, Optional

from app.schemas.priority import (
    SeverityAssessmentOutput,
    SeverityLevel,
    UrgencyLevel,
    ImpactScope,
    ConfidenceLevel,
)

logger = logging.getLogger(__name__)


class SeverityValidationError(Exception):
    """Raised when a severity assessment fails validation checks."""
    pass


def create_fallback_assessment(
    reason: str,
    missing_info: Optional[List[str]] = None
) -> SeverityAssessmentOutput:
    """
    Constructs an explicit, controlled fallback assessment marking the ticket for human review.
    Does not invent severity.
    """
    return SeverityAssessmentOutput(
        severity=SeverityLevel.UNKNOWN,
        urgency=UrgencyLevel.UNDETERMINED,
        impact_scope=ImpactScope.UNKNOWN,
        service_impact="Unable to assess service impact automatically; requires human investigation.",
        evidence=[],
        missing_information=missing_info or ["Detailed incident context and operational impact details."],
        reasoning_summary=f"Automated assessment could not be defensibly completed: {reason}. Escalated for manual triage.",
        recommended_next_step="Assign ticket to human helpdesk technician for manual review.",
        requires_human_review=True,
        confidence_level=ConfidenceLevel.LOW,
    )


def validate_assessment(
    assessment: SeverityAssessmentOutput,
    raise_on_invalid: bool = False
) -> SeverityAssessmentOutput:
    """
    Validates severity assessment fields, lengths, and logical constraints.
    Enforces that:
    1. 'unknown' severity always triggers human review.
    2. Insufficient evidence or low confidence always triggers human review.
    3. Required text fields are non-empty and meaningful.

    If validation fails and raise_on_invalid is True, raises SeverityValidationError.
    Otherwise, returns a controlled fallback assessment.
    """
    errors: List[str] = []

    # 1. Check text field lengths and non-emptiness
    if not assessment.service_impact or len(assessment.service_impact.strip()) < 3:
        errors.append("service_impact must be a meaningful non-empty explanation.")

    if not assessment.reasoning_summary or len(assessment.reasoning_summary.strip()) < 5:
        errors.append("reasoning_summary must provide a concise explanation (at least 5 characters).")

    if not assessment.recommended_next_step or len(assessment.recommended_next_step.strip()) < 3:
        errors.append("recommended_next_step must be provided.")

    # 2. Check enum validity (Pydantic validates types, but we guard against runtime invalid enum states)
    if assessment.severity not in SeverityLevel:
        errors.append(f"Invalid severity value: {assessment.severity}")

    if assessment.urgency not in UrgencyLevel:
        errors.append(f"Invalid urgency value: {assessment.urgency}")

    if assessment.impact_scope not in ImpactScope:
        errors.append(f"Invalid impact_scope value: {assessment.impact_scope}")

    if assessment.confidence_level not in ConfidenceLevel:
        errors.append(f"Invalid confidence_level value: {assessment.confidence_level}")

    if errors:
        error_msg = "; ".join(errors)
        logger.warning(f"Severity assessment validation failed: {error_msg}")
        if raise_on_invalid:
            raise SeverityValidationError(error_msg)
        return create_fallback_assessment(reason=error_msg)

    # 3. Policy & business logic constraints enforcement:
    # Rule: 'unknown' severity must require human review
    if assessment.severity == SeverityLevel.UNKNOWN:
        assessment.requires_human_review = True

    # Rule: Insufficient evidence (empty evidence list or low confidence) must trigger human review
    if not assessment.evidence or assessment.confidence_level == ConfidenceLevel.LOW:
        assessment.requires_human_review = True

    return assessment
