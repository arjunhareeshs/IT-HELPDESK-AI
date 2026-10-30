from typing import Callable, Any
from langchain_core.tools import tool
from app.repositories.policies import policies_repo
from app.repositories.incidents import incidents_repo
from app.repositories.resolutions import resolutions_repo
from app.repositories.technicians import technicians_repo
from app.services.queue_service import queue_service


def build_ticket_tools(current_ticket_id: str, allowed_college_id: str) -> list[Any]:
    """Build closure-scoped LangChain business tools with backend authorization per Section 5."""

    @tool
    async def get_category_policy(category: str) -> dict:
        """Read approved severity and routing policy for a known category."""
        return await policies_repo.get_category_policy(category)

    @tool
    async def get_related_active_incidents(service: str, building: str | None = None) -> list:
        """Find active facility incidents relevant to the current ticket."""
        return await incidents_repo.get_active_incidents(service=service, building=building)

    @tool
    async def find_similar_tickets(query: str, category: str, limit: int = 5) -> list:
        """Retrieve a small set of relevant historical tickets; verified resolutions only."""
        safe_limit = max(1, min(limit, 5))
        return await resolutions_repo.find_similar_tickets(
            current_ticket_id=current_ticket_id,
            college_id=allowed_college_id,
            query=query,
            category=category,
            limit=safe_limit,
        )

    @tool
    async def get_verified_resolution(ticket_ids: list[str]) -> list:
        """Get confirmed resolution details and verified fixes for ticket IDs."""
        results = []
        for tid in ticket_ids[:5]:
            found = await resolutions_repo.get_verified_resolution(tid)
            if found:
                results.append(found)
        return results

    @tool
    async def get_eligible_technicians(
        category: str, building: str | None = None, priority: str = "P3", subcategory: str | None = None
    ) -> list:
        """Find active technicians skilled in the category/subcategory who still have a free slot (best match first)."""
        return await technicians_repo.get_eligible_technicians(
            category=category,
            building=building,
            priority=priority,
            subcategory=subcategory,
        )

    @tool
    async def read_active_queue_rows(limit: int = 10) -> list[dict]:
        """Read N rows from the active ticket queue in PostgreSQL to inspect priority_score, queued_at timestamp, and current ordering. Rows are limited to this ticket's college and exclude this ticket."""
        safe_limit = max(1, min(limit, 50))
        return queue_service.get_active_queue_rows(
            limit=safe_limit, college_id=allowed_college_id, exclude_ticket_id=current_ticket_id
        )

    @tool
    async def get_queue_snapshot(limit: int = 10, priority: str | None = None) -> dict:
        """Read the current deterministic queue, requesting a top-N window such as 10 or 100.

        It never inserts, moves, assigns, or reprioritises a ticket. The result
        reports the server-enforced effective limit when a request is capped.
        """
        return queue_service.get_queue_snapshot(
            requested_limit=limit,
            priority=priority,
            college_id=allowed_college_id,
            exclude_ticket_id=current_ticket_id,
        )

    return [
        get_category_policy,
        get_related_active_incidents,
        find_similar_tickets,
        get_verified_resolution,
        get_eligible_technicians,
        get_queue_snapshot,
        read_active_queue_rows,
    ]
