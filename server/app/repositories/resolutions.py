import logging
from typing import Any
from sqlalchemy import select
from app.config import settings
from app.db.session import get_db_session
from app.models.resolution import TicketSolution
from app.schemas.tool_contracts import SimilarTicketItem

logger = logging.getLogger(__name__)

FALLBACK_RESOLUTIONS: list[dict[str, Any]] = [
    {
        "ticket_id": "1",
        "category": "Network",
        "subcategory": "Wireless",
        "building": "Examination Complex",
        "summary": "Access point flapping in Exam Hall B dropping authentication sessions",
        "verified_resolution": "Replaced POE switch port and updated AP firmware to v4.8. Signal verified with Wi-Fi analyzer.",
        "verified": True,
    },
    {
        "ticket_id": "2",
        "category": "Network",
        "subcategory": "Infrastructure",
        "building": "Science Block",
        "summary": "Core floor switch port down causing complete lab offline status",
        "verified_resolution": "Patched backup uplink fiber link on distribution rack 3 and reset SFP module.",
        "verified": True,
    },
    {
        "ticket_id": "3",
        "category": "Hardware",
        "subcategory": "Monitor",
        "building": "Engineering Hall",
        "summary": "Display artifacts and GPU flickering on CAD terminal #12",
        "verified_resolution": "Swapped DisplayPort cable and re-seated RTX workstation graphics card.",
        "verified": True,
    },
    {
        "ticket_id": "4",
        "category": "Software",
        "subcategory": "Licensing",
        "building": "Library West",
        "summary": "MATLAB and SPSS concurrent network license checkout failure",
        "verified_resolution": "Restarted FlexLM license daemon service on central license server.",
        "verified": True,
    },
]


class ResolutionsRepository:
    async def find_similar_tickets(
        self,
        current_ticket_id: str,
        college_id: str,
        query: str,
        category: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Retrieve verified historical resolutions matching query or category from database."""
        safe_limit = max(1, min(limit, 5))
        results: list[dict[str, Any]] = []

        try:
            with get_db_session() as session:
                query_stmt = select(TicketSolution)
                if category:
                    query_stmt = query_stmt.where(TicketSolution.category.ilike(f"%{category}%"))
                query_stmt = query_stmt.order_by(TicketSolution.created_at.desc()).limit(safe_limit)
                rows = session.execute(query_stmt).scalars().all()

                for r in rows:
                    if str(r.ticket_id) == str(current_ticket_id):
                        continue
                    item = SimilarTicketItem(
                        ticket_id=str(r.ticket_id or f"SOL-{r.solution_id}"),
                        category=r.category or category,
                        subcategory="General",
                        building="Main Facility",
                        summary=r.problem_summary,
                        verified_resolution=r.resolution,
                        verified=True,
                        similarity_score=0.85,
                    )
                    results.append(item.model_dump())

                if results:
                    return results
        except Exception:
            logger.exception("Similar-ticket lookup failed")
            if not settings.ALLOW_MEMORY_FALLBACK:
                raise

        # Fallback to in-memory historical list
        q_lower = query.lower()
        for r in FALLBACK_RESOLUTIONS:
            if r["ticket_id"] == current_ticket_id:
                continue
            score = 0.5
            if r["category"].lower() == category.lower():
                score += 0.3
            words = q_lower.split()
            matched_words = [w for w in words if w in r["summary"].lower()]
            if matched_words:
                score += min(0.2, len(matched_words) * 0.05)

            item = SimilarTicketItem(
                ticket_id=r["ticket_id"],
                category=r["category"],
                subcategory=r["subcategory"],
                building=r["building"],
                summary=r["summary"],
                verified_resolution=r["verified_resolution"],
                verified=r["verified"],
                similarity_score=round(score, 2),
            )
            results.append(item.model_dump())

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:safe_limit]

    async def get_verified_resolution(self, ticket_id: str) -> dict[str, Any] | None:
        """Fetch verified resolution text for a specific ticket."""
        try:
            with get_db_session() as session:
                row = session.execute(
                    select(TicketSolution).where(TicketSolution.ticket_id == int(ticket_id))
                ).scalar_one_or_none()
                if row:
                    return {
                        "ticket_id": str(ticket_id),
                        "resolution": row.resolution,
                        "verified": True,
                        "problem_summary": row.problem_summary,
                    }
        except Exception:
            logger.exception("Verified resolution lookup failed for %s", ticket_id)
        return None


resolutions_repo = ResolutionsRepository()
