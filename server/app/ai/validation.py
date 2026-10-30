from app.schemas.triage import TriageAssessment


def validate_triage_assessment(
    assessment: TriageAssessment,
    expected_ticket_id: str,
    expected_category: str,
    valid_similar_ids: list[str],
) -> TriageAssessment:
    """Validate backend invariant rules on model structured output per Section 8."""
    if assessment.ticket_id != expected_ticket_id:
        raise ValueError(f"LLM returned mismatched ticket_id: '{assessment.ticket_id}' vs expected '{expected_ticket_id}'")

    if assessment.category_from_classifier.strip().lower() != expected_category.strip().lower():
        raise ValueError(
            f"LLM altered classifier category: '{assessment.category_from_classifier}' vs expected '{expected_category}'"
        )

    # Unknown severity must always mandate human review
    if assessment.severity == "unknown":
        assessment.requires_human_review = True

    # Filter out similar ticket IDs that were not actually retrieved
    if valid_similar_ids:
        assessment.similar_ticket_ids = [tid for tid in assessment.similar_ticket_ids if tid in valid_similar_ids]

    return assessment
