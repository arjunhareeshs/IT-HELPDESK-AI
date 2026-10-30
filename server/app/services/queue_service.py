"""
Deterministic Queue Service.

The queue is the set of tickets waiting for work, ordered by `priority_score DESC, queued_at ASC`.
Queue position is never stored as an authoritative column; it is computed on demand and returned
with `queue_position_as_of`. Rows exposed to the LLM carry metadata only (no complaint text), are
limited to the ticket's own college, never include the ticket being triaged, and carry no location.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.schemas.queue import QueuePositionInfo
from app.repositories.tickets import tickets_repo
from app.config import settings
from app.services.priority_policy import priority_policy_engine

PRIORITY_ORDER = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}

# Statuses in which a ticket is waiting for (or being given to) a technician.
QUEUE_STATUSES = {"QUEUED", "ASSIGNED", "TRIAGED", "NEEDS_HUMAN_REVIEW", "REWORK_REQUESTED"}

_EPOCH = datetime.min.replace(tzinfo=timezone.utc)


def _aware(dt: datetime | None) -> datetime:
    if dt is None:
        return _EPOCH
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _queue_sort_key(ticket: Dict[str, Any]):
    # Highest score first, then earliest queued_at (falls back to created_at).
    return (-(ticket.get("priority_score") or 0.0), _aware(ticket.get("queued_at") or ticket.get("created_at")))


class QueueService:
    @staticmethod
    def _queue_rows(college_id: str | None = None, exclude_ticket_id: str | None = None) -> list[Dict[str, Any]]:
        rows = []
        for t in tickets_repo.get_active_tickets():
            if (t.get("status") or "").upper() not in QUEUE_STATUSES:
                continue
            if t.get("priority_score") is None:
                # Triaged tickets that predate the queue columns (priority set, score missing) are scored
                # deterministically from their priority; never-triaged tickets (no priority) are not queued yet.
                if (t.get("priority") or "").upper() not in PRIORITY_ORDER:
                    continue
                t = {**t, "priority_score": priority_policy_engine.calculate_priority_score(t["priority"])}
            if college_id and (t.get("college_id") or "default-org") != college_id:
                continue
            if exclude_ticket_id and str(t.get("ticket_id")) == str(exclude_ticket_id):
                continue
            rows.append(t)
        return sorted(rows, key=_queue_sort_key)

    @staticmethod
    def _public_row(index: int, t: Dict[str, Any]) -> Dict[str, Any]:
        queued_at = t.get("queued_at") or t.get("created_at")
        return {
            "queue_position": index,
            "ticket_id": str(t.get("ticket_id")),
            "category": t.get("predicted_category"),
            "priority": t.get("priority") or "P3",
            "priority_score": t.get("priority_score"),
            "queued_at": queued_at.isoformat() if queued_at else None,
            "status": t.get("status"),
            # No building/location or text: only what is needed to judge queue placement.
            "assigned": bool(t.get("assigned_technician_id")),
        }

    @classmethod
    def get_active_queue_rows(
        cls, limit: int = 10, college_id: str | None = None, exclude_ticket_id: str | None = None
    ) -> list[Dict[str, Any]]:
        """Read N active queue rows (priority_score, queued_at, status, category) for one college."""
        limit = max(1, min(limit, settings.LLM_MAX_QUEUE_ITEMS))
        rows = cls._queue_rows(college_id, exclude_ticket_id)
        return [cls._public_row(i, t) for i, t in enumerate(rows[:limit], start=1)]

    @classmethod
    def get_queue_snapshot(
        cls,
        requested_limit: int = 10,
        priority: str | None = None,
        college_id: str | None = None,
        exclude_ticket_id: str | None = None,
    ) -> dict[str, Any]:
        """Return a deterministic, read-only view of the active queue order."""
        max_items = max(1, settings.LLM_MAX_QUEUE_ITEMS)
        normalized_priority = priority.upper() if priority else None
        if normalized_priority and normalized_priority not in PRIORITY_ORDER:
            raise ValueError("priority must be one of P1, P2, P3, or P4")

        ordered = cls._queue_rows(college_id, exclude_ticket_id)
        if normalized_priority:
            ordered = [t for t in ordered if t.get("priority") == normalized_priority]

        effective_limit = min(max(1, requested_limit), max_items)
        return {
            "requested_limit": requested_limit,
            "effective_limit": effective_limit,
            "max_limit": max_items,
            "priority_filter": normalized_priority,
            "total_matching": len(ordered),
            "items": [cls._public_row(i, t) for i, t in enumerate(ordered[:effective_limit], start=1)],
            "queue_position_as_of": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def calculate_queue_position(
        cls,
        ticket_id: str,
        final_priority: str,
        sla_target_hours: int,
        sla_deadline: Optional[datetime] = None,
        college_id: str | None = None,
    ) -> QueuePositionInfo:
        """Position of a ticket in the live queue. Call after the ticket has been ingested."""
        ordered = cls._queue_rows(college_id)
        position = next(
            (i for i, t in enumerate(ordered, start=1) if str(t.get("ticket_id")) == str(ticket_id)),
            None,
        )
        return QueuePositionInfo(
            ticket_id=str(ticket_id),
            final_priority=final_priority,
            queue_position=position if position is not None else len(ordered) + 1,
            queue_position_as_of=datetime.now(timezone.utc),
            sla_target_hours=sla_target_hours,
            sla_deadline=sla_deadline,
        )


queue_service = QueueService()
