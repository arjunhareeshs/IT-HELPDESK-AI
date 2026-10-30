"""
Analytics computed from real ticket records.

Every figure here is derived from the tickets returned by the repository. Where a metric cannot be
computed (for example SLA compliance for a technician with no resolved tickets) the value is None
instead of an invented number.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any, Callable, Iterable

from app.schemas.ticket import TicketRead
from app.services.priority_policy import PRIORITY_SLA_MAP

RESOLVED_STATUSES = {"RESOLVED", "CLOSED"}
INACTIVE_STATUSES = RESOLVED_STATUSES | {"CANCELLED"}
AWAITING_STATUSES = {"USER_VERIFICATION", "RESOLUTION_SUBMITTED"}
ASSIGNMENT_EVENTS = {"TECHNICIAN_ASSIGNED", "AUTO_TRIAGED"}


def _upper(status: str | None) -> str:
    return (status or "").replace(" ", "_").upper()


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_resolved(t: TicketRead) -> bool:
    return _upper(t.status) in RESOLVED_STATUSES


def is_active(t: TicketRead) -> bool:
    return _upper(t.status) not in INACTIVE_STATUSES


def resolved_at(t: TicketRead) -> datetime | None:
    return _aware(t.resolution_confirmed_at) if is_resolved(t) else None


def sla_deadline(t: TicketRead) -> datetime | None:
    hours = PRIORITY_SLA_MAP.get(t.priority or "")
    created = _aware(t.created_at)
    return created + timedelta(hours=hours) if hours and created else None


def is_overdue(t: TicketRead, now: datetime) -> bool:
    deadline = sla_deadline(t)
    return bool(is_active(t) and deadline and deadline < now)


def met_sla(t: TicketRead) -> bool | None:
    deadline, done = sla_deadline(t), resolved_at(t)
    if deadline is None or done is None:
        return None
    return done <= deadline


def hours_to_resolve(t: TicketRead) -> float | None:
    done, created = resolved_at(t), _aware(t.created_at)
    if done is None or created is None:
        return None
    return max((done - created).total_seconds() / 3600, 0.0)


def waiting_hours(t: TicketRead) -> float:
    """Hours between creation and the first assignment event (time spent waiting for a technician)."""
    created = _aware(t.created_at)
    if created is None or not t.assigned_technician_id:
        return 0.0
    for item in sorted(t.timeline, key=lambda i: i.timestamp):
        if item.status in ASSIGNMENT_EVENTS:
            try:
                ts = _aware(datetime.fromisoformat(item.timestamp))
            except ValueError:
                continue
            if ts and ts >= created:
                return (ts - created).total_seconds() / 3600
    return 0.0


def _round(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(value, digits)


def dashboard_stats(tickets: list[TicketRead], now: datetime) -> dict[str, Any]:
    active = [t for t in tickets if is_active(t)]
    high = [t for t in active if t.priority in ("P1", "P2") or t.severity in ("critical", "high")]
    today = now.astimezone().date()
    resolved_today = sum(
        1 for t in tickets if (d := resolved_at(t)) and d.astimezone().date() == today
    )
    return {
        "active_tickets": len(active),
        "completed_tickets": sum(1 for t in tickets if is_resolved(t)),
        "high_priority_tickets": len(high),
        "needs_verification_tickets": sum(1 for t in tickets if _upper(t.status) in AWAITING_STATUSES),
        "open_tickets": len(active),
        "critical_high_tickets": len(high),
        "resolved_today": resolved_today,
        "sla_at_risk_tickets": sum(1 for t in active if is_overdue(t, now)),
        "last_updated": now.isoformat(),
    }


def _flow_buckets(period: str, now: datetime) -> list[tuple[str, datetime, datetime]]:
    local_now = now.astimezone()
    buckets: list[tuple[str, datetime, datetime]] = []
    if period == "hour":
        step = timedelta(minutes=10)
        for i in range(6, 0, -1):
            end = local_now - step * (i - 1)
            start = end - step
            label = "Just now" if i == 1 else f"{(i - 1) * 10}m ago"
            buckets.append((label, start, end))
    elif period == "7d":
        midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(6, -1, -1):
            start = midnight - timedelta(days=i)
            buckets.append((start.strftime("%a"), start, start + timedelta(days=1)))
    elif period == "30d":
        midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        for i in range(4, 0, -1):
            end = midnight - timedelta(days=7 * (i - 1))
            buckets.append((f"Week {5 - i}", end - timedelta(days=7), end))
    else:  # today, 2-hour buckets
        midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        for h in range(0, 24, 2):
            start = midnight + timedelta(hours=h)
            if start > local_now:
                break
            buckets.append((start.strftime("%H:%M"), start, start + timedelta(hours=2)))
    return buckets


def ticket_flow(tickets: list[TicketRead], period: str, now: datetime) -> list[dict[str, Any]]:
    points = []
    for label, start, end in _flow_buckets(period, now):
        created = sum(1 for t in tickets if (c := _aware(t.created_at)) and start <= c < end)
        resolved = sum(1 for t in tickets if (d := resolved_at(t)) and start <= d < end)
        backlog = sum(
            1
            for t in tickets
            if (c := _aware(t.created_at)) and c < end and not ((d := resolved_at(t)) and d < end)
        )
        points.append({"timestamp": label, "label": label, "created": created, "resolved": resolved, "backlog": backlog})
    return points


def category_breakdown(tickets: list[TicketRead]) -> list[dict[str, Any]]:
    total = len(tickets) or 1
    by_cat: dict[str, Counter] = defaultdict(Counter)
    for t in tickets:
        by_cat[t.predicted_category or "Unclassified"][t.predicted_subcategory or "General"] += 1
    items = []
    for cat, subs in sorted(by_cat.items(), key=lambda kv: -sum(kv[1].values())):
        count = sum(subs.values())
        items.append({
            "category": cat,
            "count": count,
            "percentage": round(count * 100 / total, 1),
            "subcategories": [{"name": n, "count": c} for n, c in subs.most_common()],
        })
    return items


def severity_by_category(tickets: list[TicketRead], now: datetime) -> list[dict[str, Any]]:
    grouped: dict[str, list[TicketRead]] = defaultdict(list)
    for t in tickets:
        grouped[t.predicted_category or "Unclassified"].append(t)
    items = []
    for cat, group in sorted(grouped.items(), key=lambda kv: -len(kv[1])):
        counts = Counter(t.severity for t in group)
        items.append({
            "category": cat,
            "critical": counts.get("critical", 0),
            "high": counts.get("high", 0),
            "medium": counts.get("medium", 0),
            "low": counts.get("low", 0),
            "overdue": sum(1 for t in group if is_overdue(t, now)),
            "total": len(group),
        })
    return items


def resolution_time(
    tickets: list[TicketRead], building: str | None = None, priority: str | None = None
) -> list[dict[str, Any]]:
    grouped: dict[str, list[TicketRead]] = defaultdict(list)
    for t in tickets:
        if not is_resolved(t) or hours_to_resolve(t) is None:
            continue
        if building and building.lower() not in (t.building or "").lower():
            continue
        if priority and (t.priority or "").lower() != priority.lower():
            continue
        grouped[t.predicted_category or "Unclassified"].append(t)
    items = []
    for cat, group in sorted(grouped.items()):
        totals = [hours_to_resolve(t) or 0.0 for t in group]
        waits = [min(waiting_hours(t), hours_to_resolve(t) or 0.0) for t in group]
        med_total = median(totals)
        med_wait = median(waits)
        items.append({
            "category": cat,
            "median_hours": round(med_total, 2),
            "active_work_hours": round(max(med_total - med_wait, 0.0), 2),
            "waiting_hours": round(med_wait, 2),
            "ticket_count": len(group),
        })
    return items


def _by_technician(tickets: Iterable[TicketRead]) -> dict[str, list[TicketRead]]:
    grouped: dict[str, list[TicketRead]] = defaultdict(list)
    for t in tickets:
        if t.assigned_technician_id:
            grouped[t.assigned_technician_id].append(t)
    return grouped


def technician_stats(tech_tickets: list[TicketRead], now: datetime) -> dict[str, Any]:
    resolved = [t for t in tech_tickets if is_resolved(t)]
    active = [t for t in tech_tickets if is_active(t)]
    sla_results = [r for t in resolved if (r := met_sla(t)) is not None]
    reworked = [t for t in tech_tickets if t.re_evaluation_reason]
    attempts = len(resolved) + len([t for t in reworked if not is_resolved(t)])
    return {
        "active_tickets": len(active),
        "completed_tickets": len(resolved),
        "sla_compliance_percent": _round(100 * sum(sla_results) / len(sla_results)) if sla_results else None,
        "rework_rate_percent": _round(100 * len(reworked) / attempts) if attempts else None,
        "on_time_rate_percent": _round(100 * sum(sla_results) / len(sla_results)) if sla_results else None,
        "status_breakdown": {
            "assigned": sum(1 for t in active if _upper(t.status) == "ASSIGNED"),
            "in_progress": sum(1 for t in active if _upper(t.status) == "IN_PROGRESS"),
            "waiting_user": sum(1 for t in active if _upper(t.status) in AWAITING_STATUSES),
            "blocked": sum(1 for t in active if _upper(t.status) == "NEEDS_HUMAN_REVIEW"),
            "overdue": sum(1 for t in active if is_overdue(t, now)),
        },
    }


def technician_workload(
    technicians: list[dict[str, Any]], tickets: list[TicketRead], now: datetime
) -> list[dict[str, Any]]:
    grouped = _by_technician(tickets)
    items = []
    for tech in technicians:
        stats = technician_stats(grouped.get(str(tech["id"]), []), now)
        items.append({
            "technician_id": str(tech["id"]),
            "name": tech["name"],
            "department": tech.get("department") or f"{(tech.get('specialties') or ['General IT'])[0]} Support",
            **{k: stats[k] for k in ("active_tickets", "completed_tickets", "sla_compliance_percent", "rework_rate_percent", "status_breakdown")},
        })
    return items


def technician_category_matrix(
    technicians: list[dict[str, Any]], tickets: list[TicketRead]
) -> list[dict[str, Any]]:
    grouped = _by_technician(tickets)
    items = []
    for tech in technicians:
        by_cat: dict[str, list[TicketRead]] = defaultdict(list)
        for t in grouped.get(str(tech["id"]), []):
            if is_resolved(t):
                by_cat[t.predicted_category or "Unclassified"].append(t)
        skills = {}
        for cat, group in by_cat.items():
            clean = sum(1 for t in group if not t.re_evaluation_reason)
            skills[cat] = {
                "category": cat,
                "tickets_resolved": len(group),
                "success_rate_percent": round(100 * clean / len(group), 1),
                "median_resolution_hours": round(median(h for t in group if (h := hours_to_resolve(t)) is not None), 2)
                if any(hours_to_resolve(t) is not None for t in group)
                else 0.0,
            }
        items.append({"technician_id": str(tech["id"]), "name": tech["name"], "skills": skills})
    return items
