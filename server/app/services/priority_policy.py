"""
Deterministic Priority and SLA Policy Engine.
Computes final ticket priority (P1-P4) and SLA target hours using approved institutional rules.
Never relies on an LLM to invent numeric queue positions or final priorities.
"""

from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from app.schemas.triage import TriageAssessment

PRIORITY_SLA_MAP = {
    "P1": 2,    # 2 hours
    "P2": 4,    # 4 hours
    "P3": 24,   # 24 hours
    "P4": 72,   # 72 hours
}

class PriorityPolicyEngine:
    """
    Deterministic rule matrix calculating priority and SLA.
    """

    @staticmethod
    def calculate_priority_and_sla(
        assessment: TriageAssessment,
        category_policy: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, int, bool, datetime]:
        """
        Returns:
            final_priority: str ("P1", "P2", "P3", "P4")
            sla_target_hours: int
            needs_human_review: bool
            sla_deadline: datetime
        """
        needs_human_review = assessment.requires_human_review or (assessment.severity == "unknown")
        severity = assessment.severity
        urgency = assessment.urgency
        impact = assessment.impact_scope

        # Rule evaluation
        if (impact == "widespread" and urgency in ("immediate", "urgent")) or \
           (severity == "critical" and impact in ("widespread", "multiple_users")):
            priority = "P1"
        elif severity == "critical" or \
             (severity == "high" and urgency in ("immediate", "urgent")) or \
             (urgency == "immediate" and impact in ("widespread", "multiple_users")):
            priority = "P2"
        elif severity in ("high", "medium") or urgency in ("urgent", "immediate") or impact == "multiple_users":
            priority = "P3"
        elif severity == "low" and urgency in ("normal", "undetermined"):
            priority = "P4"
        else:
            priority = "P3"

        # Apply category policy constraints if present
        sla_hours = PRIORITY_SLA_MAP.get(priority, 24)
        if category_policy:
            max_priority = category_policy.get("max_priority")
            if max_priority == "P2" and priority == "P1":
                priority = "P2"
                sla_hours = PRIORITY_SLA_MAP["P2"]
            custom_sla = category_policy.get("sla_hours")
            if custom_sla and custom_sla < sla_hours:
                sla_hours = custom_sla

        now = datetime.now(timezone.utc)
        sla_deadline = now + timedelta(hours=sla_hours)

        return priority, sla_hours, needs_human_review, sla_deadline

    @staticmethod
    def calculate_priority_score(priority: str, urgency: str = "normal", impact: str = "single_user") -> float:
        """
        Calculate deterministic priority score (0.0 to 100.0) based on priority tier, urgency, and impact.
        Used for queue ordering (priority_score DESC, queued_at ASC).
        """
        base_scores = {
            "P1": 90.0,
            "P2": 70.0,
            "P3": 45.0,
            "P4": 20.0,
        }
        score = base_scores.get((priority or "P3").upper(), 45.0)

        # Urgency adjustment (+0 to +5)
        if urgency == "immediate":
            score += 5.0
        elif urgency == "urgent":
            score += 3.0

        # Impact adjustment (+0 to +5)
        if impact == "widespread":
            score += 5.0
        elif impact == "multiple_users":
            score += 3.0

        return round(min(100.0, score), 2)

priority_policy_engine = PriorityPolicyEngine()
