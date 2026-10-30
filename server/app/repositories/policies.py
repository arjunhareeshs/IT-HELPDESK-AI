import logging
from typing import Any
from sqlalchemy import select
from app.db.session import get_db_session
from app.models.policy import CategoryPolicy, PriorityPolicy
from app.schemas.tool_contracts import CategoryPolicyOutput

logger = logging.getLogger(__name__)

FALLBACK_POLICIES: dict[str, dict[str, Any]] = {
    "Network": {
        "category": "Network",
        "allowed_severities": ["critical", "high", "medium", "low"],
        "default_priority": "P2",
        "policy_version": "v1.0",
        "requires_site_inspection": True,
        "escalation_threshold_hours": 2,
    },
    "Hardware": {
        "category": "Hardware",
        "allowed_severities": ["critical", "high", "medium", "low"],
        "default_priority": "P3",
        "policy_version": "v1.0",
        "requires_site_inspection": True,
        "escalation_threshold_hours": 4,
    },
    "Software": {
        "category": "Software",
        "allowed_severities": ["high", "medium", "low"],
        "default_priority": "P3",
        "policy_version": "v1.0",
        "requires_site_inspection": False,
        "escalation_threshold_hours": 6,
    },
    "Database": {
        "category": "Database",
        "allowed_severities": ["critical", "high", "medium"],
        "default_priority": "P2",
        "policy_version": "v1.0",
        "requires_site_inspection": False,
        "escalation_threshold_hours": 1,
    },
    "Inquiry/Help": {
        "category": "Inquiry/Help",
        "allowed_severities": ["medium", "low", "unknown"],
        "default_priority": "P4",
        "policy_version": "v1.0",
        "requires_site_inspection": False,
        "escalation_threshold_hours": 8,
    },
    "IT General Support": {
        "category": "IT General Support",
        "allowed_severities": ["medium", "low", "unknown"],
        "default_priority": "P4",
        "policy_version": "v1.0",
        "requires_site_inspection": False,
        "escalation_threshold_hours": 8,
    },
}


class PoliciesRepository:
    async def get_category_policy(self, category: str) -> dict[str, Any]:
        """Fetch category policy from database with fallback."""
        try:
            with get_db_session() as session:
                policy_row = session.execute(
                    select(CategoryPolicy)
                    .where(CategoryPolicy.category.ilike(category), CategoryPolicy.is_active.is_(True))
                    .order_by(CategoryPolicy.subcategory.is_(None).desc(), CategoryPolicy.policy_id)
                ).scalars().first()

                if policy_row:
                    return CategoryPolicyOutput(
                        category=policy_row.category,
                        allowed_severities=["critical", "high", "medium", "low"],
                        default_priority=policy_row.default_priority,
                        policy_version=policy_row.policy_version,
                        requires_site_inspection=policy_row.category in ["Network", "Hardware"],
                        escalation_threshold_hours=policy_row.escalation_hours or 4,
                        sla_hours=policy_row.sla_resolution_hours,
                    ).model_dump()
        except Exception:
            logger.exception("Category policy lookup failed for %s; using built-in defaults", category)

        # Fallback to in-memory defaults
        fallback = FALLBACK_POLICIES.get(category, FALLBACK_POLICIES["IT General Support"])
        return CategoryPolicyOutput(**fallback).model_dump()

    async def get_priority_policy(self, priority_code: str) -> dict[str, Any] | None:
        """Fetch priority SLA policy from database."""
        try:
            with get_db_session() as session:
                row = session.execute(
                    select(PriorityPolicy).where(PriorityPolicy.priority_code == priority_code)
                ).scalar_one_or_none()
                if row:
                    return {
                        "priority_code": row.priority_code,
                        "response_target_hours": float(row.response_target_hours),
                        "resolution_target_hours": float(row.resolution_target_hours),
                        "description": row.description,
                    }
        except Exception:
            logger.exception("Priority policy lookup failed for %s", priority_code)
        return None


policies_repo = PoliciesRepository()
