import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from sqlalchemy import select, update, desc
from sqlalchemy.orm import selectinload
from app.db.session import get_db_session
from app.models.user import User
from app.models.ticket import Ticket
from app.models.history import TicketHistory
from app.models.ai_assessment import TicketAIAssessment
from app.models.assignment import TicketAssignment
from app.models.resolution_attempt import TicketResolutionAttempt
from app.models.case_memory import TicketCaseMemory
from app.models.notification import NotificationOutbox
from app.models.attachment import TicketAttachment
from app.models.resolution import TicketSolution
from app.config import settings
from app.schemas.ticket import TicketCreate, TicketRead, TimelineItem, AttachmentItem
from app.schemas.triage import CaseFacts, TicketCaseMemory as CaseMemorySchema, TriageAssessment

logger = logging.getLogger(__name__)

PRIORITY_ALIASES = {"critical": "P1", "high": "P2", "medium": "P3", "low": "P4"}
PRIORITY_TO_SEVERITY = {"P1": "critical", "P2": "high", "P3": "medium", "P4": "low"}

_TICKETS_CACHE: dict[str, dict[str, Any]] = {}
_CASE_MEMORY_CACHE: dict[str, CaseMemorySchema] = {}
_ASSESSMENTS_CACHE: dict[str, TriageAssessment] = {}


def normalize_priority(value: str | None) -> str | None:
    """Map legacy priority labels (High, critical, ...) onto P1-P4."""
    if not value:
        return None
    if value.upper() in ("P1", "P2", "P3", "P4"):
        return value.upper()
    return PRIORITY_ALIASES.get(value.lower())


def _ticket_eager_options():
    """Load every relation the TicketRead builder touches in a handful of batched queries (no N+1)."""
    return (
        selectinload(Ticket.history_events).selectinload(TicketHistory.changed_by),
        selectinload(Ticket.assessments),
        selectinload(Ticket.attachments),
        selectinload(Ticket.complainant),
        selectinload(Ticket.assignee),
    )


class TicketsRepository:
    def _db_failed(self, op: str, exc: Exception) -> None:
        """Log a database failure; re-raise unless in-memory fallback is explicitly allowed."""
        logger.exception("Database operation '%s' failed: %s", op, exc)
        if not settings.ALLOW_MEMORY_FALLBACK:
            raise exc

    def _parse_id(self, ticket_id_str: str) -> int | None:
        """Helper to extract integer ID from 'TCK-2026-0001' or string '1'."""
        # Only plain numeric ids address database rows. In-memory fallback ids such as
        # "TCK-2026-0001" must never alias a real row (that would leak another ticket's data).
        if not ticket_id_str or not str(ticket_id_str).isdigit():
            return None
        return int(ticket_id_str)

    def _build_ticket_read(self, ticket_id: str, record: dict[str, Any]) -> TicketRead:
        events = record.get("timeline", [])
        timeline_items = []
        for ev in events:
            if isinstance(ev, TimelineItem):
                timeline_items.append(ev)
            elif isinstance(ev, dict):
                timeline_items.append(
                    TimelineItem(
                        timestamp=str(ev.get("timestamp") or ev.get("created_at") or datetime.now(timezone.utc).isoformat()),
                        status=str(ev.get("event_type") or ev.get("status") or "UPDATE"),
                        actor=str(ev.get("actor") or ev.get("actor_name") or "System"),
                        note=ev.get("note") or ev.get("notes") or "",
                    )
                )

        assessment = _ASSESSMENTS_CACHE.get(ticket_id)
        evidence_texts = record.get("evidence") or ([e.observation for e in assessment.evidence] if assessment else [])
        reasoning = record.get("reasoning_summary") or (assessment.explanation if assessment else None)
        recommended_step = record.get("recommended_next_step") or (assessment.suggested_next_step if assessment else None)
        service_impact = record.get("service_impact") or (assessment.service_impact if assessment else None)
        missing_info = record.get("missing_information") or (assessment.missing_information if assessment else [])
        urgency = record.get("urgency") or (assessment.urgency if assessment else None)
        impact_scope = record.get("impact_scope") or (assessment.impact_scope if assessment else None)
        severity_conf = record.get("severity_confidence") or (assessment.confidence_level if assessment else None)

        created_at_val = record.get("created_at")
        if isinstance(created_at_val, str):
            try:
                created_at_val = datetime.fromisoformat(created_at_val)
            except Exception:
                created_at_val = datetime.now(timezone.utc)
        elif not isinstance(created_at_val, datetime):
            created_at_val = datetime.now(timezone.utc)

        attachments_raw = record.get("attachments", [])
        attachment_items: list[AttachmentItem] = []
        reference_images: list[AttachmentItem] = []
        for att in attachments_raw:
            if isinstance(att, AttachmentItem):
                attachment_items.append(att)
                if (att.mime_type or "").startswith("image/") or att.attachment_type in ("complaint", "diagnostic", "reference"):
                    reference_images.append(att)
            elif isinstance(att, dict):
                item = AttachmentItem(
                    attachment_id=str(att.get("attachment_id", "")),
                    ticket_id=str(att.get("ticket_id", ticket_id)),
                    attachment_type=att.get("attachment_type", "complaint"),
                    file_name=att.get("file_name", "attachment"),
                    mime_type=att.get("mime_type", "application/octet-stream"),
                    file_size_bytes=int(att.get("file_size_bytes", 0)),
                    url=att.get("url", f"/api/v1/tickets/{ticket_id}/attachments/{att.get('attachment_id')}/file"),
                    created_at=att.get("created_at"),
                )
                attachment_items.append(item)
                if (item.mime_type or "").startswith("image/") or item.attachment_type in ("complaint", "diagnostic", "reference"):
                    reference_images.append(item)

        return TicketRead(
            ticket_id=str(ticket_id),
            created_at=created_at_val,
            complaint_text=record.get("complaint_text") or record.get("description", ""),
            complainant_name=record.get("complainant_name") or "Complainant",
            complainant_id=str(record.get("complainant_id") or record.get("raised_by_user_id") or "1"),
            building=record.get("building") or "Main Facility",
            college_id=record.get("college_id") or "default-org",
            status=record.get("status", "RECEIVED"),
            predicted_category=record.get("predicted_category") or record.get("category"),
            predicted_subcategory=record.get("predicted_subcategory"),
            classification_confidence=(
                record.get("classification_confidence")
                if record.get("classification_confidence") is not None
                else record.get("ai_confidence")
            ),
            priority_score=record.get("priority_score"),
            queued_at=record.get("queued_at"),
            severity=record.get("severity") or PRIORITY_TO_SEVERITY.get(normalize_priority(record.get("priority")) or ""),
            priority=normalize_priority(record.get("priority")),
            urgency=urgency,
            impact_scope=impact_scope,
            severity_confidence=severity_conf,
            service_impact=service_impact,
            evidence=evidence_texts,
            missing_information=missing_info,
            reasoning_summary=reasoning,
            recommended_next_step=recommended_step,
            requires_human_review=record.get("requires_human_review", False),
            assigned_technician_id=str(record["assigned_technician_id"]) if record.get("assigned_technician_id") else None,
            assigned_technician_name=record.get("assigned_technician_name"),
            action_notes=record.get("action_notes"),
            action_images=record.get("action_images", []),
            attachments=attachment_items,
            reference_images=reference_images,
            resolution_confirmed_at=record.get("resolution_confirmed_at"),
            re_evaluation_reason=record.get("re_evaluation_reason"),
            timeline=timeline_items,
        )

    async def create_ticket(
        self,
        data: TicketCreate,
        raised_by_user_id: int | None = None,
        on_created: Any = None,
    ) -> TicketRead:
        """Persist a ticket. `raised_by_user_id` pins the complainant (e.g. the email sender's account);
        `on_created(session, ticket)` adds rows that must commit atomically with the ticket."""
        now = datetime.now(timezone.utc)
        record: dict[str, Any] = {}

        try:
            with get_db_session() as session:
                # Find or ensure complainant user
                user_id = 1
                comp_user = session.get(User, raised_by_user_id) if raised_by_user_id else None
                if not comp_user:
                    # Several users can share a display name; take the first instead of failing.
                    comp_user = session.execute(
                        select(User).where(User.full_name.ilike(data.complainant_name)).order_by(User.user_id)
                    ).scalars().first()

                if not comp_user:
                    comp_user = session.execute(select(User).where(User.role.ilike("user"))).scalars().first()

                if not comp_user:
                    comp_user = User(
                        full_name=data.complainant_name,
                        email=f"{data.complainant_id.lower()}@helpdesk.corp",
                        role="User",
                        building=data.building,
                    )
                    session.add(comp_user)
                    session.flush()

                user_id = comp_user.user_id

                # Create Ticket in PostgreSQL
                new_ticket = Ticket(
                    raised_by_user_id=user_id,
                    description=data.complaint_text,
                    building=data.building,
                    college_id=data.college_id,
                    affected_service=data.affected_service,
                    status="AI_PENDING",
                    created_at=now,
                    updated_at=now,
                )
                session.add(new_ticket)
                session.flush()

                ticket_id_str = str(new_ticket.ticket_id)

                # Create initial history event
                hist = TicketHistory(
                    ticket_id=new_ticket.ticket_id,
                    changed_by_user_id=user_id,
                    old_status=None,
                    new_status="AI_PENDING",
                    event_type="TICKET_CREATED",
                    actor_type="complainant",
                    note="Ticket registered in helpdesk system.",
                    created_at=now,
                )
                session.add(hist)

                # Initialize Case Memory
                memory = TicketCaseMemory(
                    ticket_id=new_ticket.ticket_id,
                    established_facts=[
                        {"observation": f"Reported at {data.building} by {data.complainant_name}"},
                        {"observation": f"Affected service: {data.affected_service or 'General IT'}"}
                    ],
                    missing_facts=[],
                    contradictions_detected=[],
                    last_triaged_at=now,
                )
                session.add(memory)
                if on_created:
                    on_created(session, new_ticket)
                session.commit()

                record = {
                    "ticket_id": ticket_id_str,
                    "created_at": now,
                    "complaint_text": data.complaint_text,
                    "complainant_name": data.complainant_name,
                    "complainant_id": str(user_id),
                    "building": data.building,
                    "college_id": data.college_id,
                    "status": "AI_PENDING",
                    "predicted_category": None,
                    "predicted_subcategory": None,
                    "classification_confidence": None,
                    "severity": None,
                    "priority": None,
                    "assigned_technician_id": None,
                    "assigned_technician_name": None,
                    "timeline": [
                        TimelineItem(
                            timestamp=now.isoformat(),
                            status="TICKET_CREATED",
                            actor=data.complainant_name,
                            note="Ticket registered in helpdesk system.",
                        )
                    ],
                }

                _TICKETS_CACHE[ticket_id_str] = record
                return self._build_ticket_read(ticket_id_str, record)

        except Exception as e:
            self._db_failed("create_ticket", e)
            # Development-only memory fallback (ALLOW_MEMORY_FALLBACK)
            ticket_id_str = f"TCK-2026-{len(_TICKETS_CACHE) + 1:04d}"
            record = {
                "ticket_id": ticket_id_str,
                "created_at": now,
                "complaint_text": data.complaint_text,
                "complainant_name": data.complainant_name,
                "complainant_id": data.complainant_id,
                "building": data.building,
                "college_id": data.college_id,
                "status": "AI_PENDING",
                "timeline": [
                    TimelineItem(
                        timestamp=now.isoformat(),
                        status="TICKET_CREATED",
                        actor=data.complainant_name,
                        note="Ticket registered in helpdesk system.",
                    )
                ],
            }
            _TICKETS_CACHE[ticket_id_str] = record
            return self._build_ticket_read(ticket_id_str, record)

    async def get_ticket(self, ticket_id: str) -> TicketRead | None:
        # Blocking SQLAlchemy work runs in a worker thread so the event loop keeps serving requests.
        return await asyncio.to_thread(self._get_ticket_sync, ticket_id)

    def _get_ticket_sync(self, ticket_id: str) -> TicketRead | None:
        int_id = self._parse_id(ticket_id)
        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(
                        select(Ticket).options(*_ticket_eager_options()).where(Ticket.ticket_id == int_id)
                    ).scalar_one_or_none()
                    if t:
                        timeline = []
                        for h in t.history_events:
                            timeline.append(
                                TimelineItem(
                                    timestamp=h.created_at.isoformat() if h.created_at else "",
                                    status=h.event_type or h.new_status,
                                    actor=h.changed_by.full_name if h.changed_by else (h.actor_type or "System"),
                                    note=h.note or "",
                                )
                            )

                        latest_assessment = t.assessments[0] if t.assessments else None

                        record = {
                            "ticket_id": str(t.ticket_id),
                            "created_at": t.created_at,
                            "complaint_text": t.description,
                            "complainant_name": t.complainant.full_name if t.complainant else "User",
                            "complainant_id": str(t.raised_by_user_id),
                            "building": t.building or "Main Facility",
                            "college_id": t.college_id or "default-org",
                            "status": t.status,
                            "predicted_category": t.category,
                            "predicted_subcategory": latest_assessment.subcategory if latest_assessment else None,
                            "classification_confidence": (float(t.ai_confidence) if t.ai_confidence is not None else None),
                            "severity": latest_assessment.severity if latest_assessment else None,
                            "priority": t.priority,
                            "priority_score": float(t.priority_score) if t.priority_score is not None else None,
                            "queued_at": t.queued_at,
                            "assigned_technician_id": str(t.assigned_to_user_id) if t.assigned_to_user_id else None,
                            "assigned_technician_name": t.assignee.full_name if t.assignee else None,
                            "action_notes": t.resolution,
                            "re_evaluation_reason": t.re_evaluation_reason,
                            "resolution_confirmed_at": t.resolution_confirmed_at,
                            "reasoning_summary": getattr(latest_assessment, "explanation", None) or getattr(latest_assessment, "suggested_fix", None) if latest_assessment else None,
                            "recommended_next_step": getattr(latest_assessment, "suggested_next_step", None) or getattr(latest_assessment, "suggested_fix", None) if latest_assessment else None,
                            "service_impact": getattr(latest_assessment, "service_impact", None) if latest_assessment else None,
                            "urgency": getattr(latest_assessment, "urgency", None) if latest_assessment else None,
                            "impact_scope": getattr(latest_assessment, "impact_scope", None) if latest_assessment else None,
                            "severity_confidence": getattr(latest_assessment, "priority_confidence_level", None) if latest_assessment else None,
                            "requires_human_review": getattr(latest_assessment, "requires_human_review", False) if latest_assessment else False,
                            "attachments": [
                                {
                                    "attachment_id": str(att.attachment_id),
                                    "ticket_id": str(att.ticket_id),
                                    "attachment_type": att.attachment_type,
                                    "file_name": att.file_name,
                                    "mime_type": att.mime_type,
                                    "file_size_bytes": att.file_size_bytes,
                                    "url": att.storage_key if (att.storage_key and (att.storage_key.startswith("http://") or att.storage_key.startswith("https://"))) else f"/api/v1/tickets/{t.ticket_id}/attachments/{att.attachment_id}/file",
                                    "created_at": att.created_at.isoformat() if att.created_at else None,
                                }
                                for att in (t.attachments or [])
                            ],
                            "timeline": timeline,
                        }
                        return self._build_ticket_read(str(t.ticket_id), record)
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            return self._build_ticket_read(ticket_id, _TICKETS_CACHE[ticket_id])
        return None

    async def list_tickets(self, *args, **kwargs) -> list[TicketRead]:
        return await asyncio.to_thread(self._list_tickets_sync, *args, **kwargs)

    def _list_tickets_sync(
        self,
        status: str | None = None,
        priority: str | None = None,
        building: str | None = None,
        category: str | None = None,
        raised_by_user_id: int | None = None,
        assigned_to_user_id: int | None = None,
    ) -> list[TicketRead]:
        results: list[TicketRead] = []

        try:
            with get_db_session() as session:
                query = select(Ticket).options(*_ticket_eager_options()).order_by(desc(Ticket.created_at))

                if status and status.lower() not in ("all", "any"):
                    query = query.where(Ticket.status.ilike(status))
                if priority and priority.lower() not in ("all", "any"):
                    query = query.where(Ticket.priority == priority)
                if building and building.lower() not in ("all", "any"):
                    query = query.where(Ticket.building.ilike(f"%{building}%"))
                if category and category.lower() not in ("all", "any"):
                    query = query.where(Ticket.category.ilike(f"%{category}%"))
                if raised_by_user_id:
                    query = query.where(Ticket.raised_by_user_id == raised_by_user_id)
                if assigned_to_user_id:
                    query = query.where(Ticket.assigned_to_user_id == assigned_to_user_id)

                tickets = session.execute(query).scalars().all()
                for t in tickets:
                    timeline = []
                    for h in t.history_events:
                        timeline.append(
                            TimelineItem(
                                timestamp=h.created_at.isoformat() if h.created_at else "",
                                status=h.event_type or h.new_status,
                                actor=h.changed_by.full_name if h.changed_by else (h.actor_type or "System"),
                                note=h.note or "",
                            )
                        )
                    latest = t.assessments[0] if t.assessments else None
                    rec = {
                        "ticket_id": str(t.ticket_id),
                        "created_at": t.created_at,
                        "complaint_text": t.description,
                        "complainant_name": t.complainant.full_name if t.complainant else "User",
                        "complainant_id": str(t.raised_by_user_id),
                        "building": t.building or "Main Facility",
                        "college_id": t.college_id or "default-org",
                        "status": t.status,
                        "predicted_category": t.category,
                        "predicted_subcategory": latest.subcategory if latest else None,
                        "severity": latest.severity if latest else None,
                        "urgency": latest.urgency if latest else None,
                        "impact_scope": latest.impact_scope if latest else None,
                        "requires_human_review": latest.requires_human_review if latest else False,
                        "priority": t.priority,
                        "classification_confidence": (float(t.ai_confidence) if t.ai_confidence is not None else None),
                        "assigned_technician_id": str(t.assigned_to_user_id) if t.assigned_to_user_id else None,
                        "assigned_technician_name": t.assignee.full_name if t.assignee else None,
                        "action_notes": t.resolution,
                        "re_evaluation_reason": t.re_evaluation_reason,
                        "resolution_confirmed_at": t.resolution_confirmed_at,
                        "priority_score": float(t.priority_score) if t.priority_score is not None else None,
                        "queued_at": t.queued_at,
                        "attachments": [
                            {
                                "attachment_id": str(att.attachment_id),
                                "ticket_id": str(att.ticket_id),
                                "attachment_type": att.attachment_type,
                                "file_name": att.file_name,
                                "mime_type": att.mime_type,
                                "file_size_bytes": att.file_size_bytes,
                                "url": att.storage_key if (att.storage_key and (att.storage_key.startswith("http://") or att.storage_key.startswith("https://"))) else f"/api/v1/tickets/{t.ticket_id}/attachments/{att.attachment_id}/file",
                                "created_at": att.created_at.isoformat() if att.created_at else None,
                            }
                            for att in (t.attachments or [])
                        ],
                        "timeline": timeline,
                    }
                    results.append(self._build_ticket_read(str(t.ticket_id), rec))

                if results:
                    return results
        except Exception as exc:
            self._db_failed("db", exc)

        # In-memory cached list fallback
        for tid, rec in _TICKETS_CACHE.items():
            results.append(self._build_ticket_read(tid, rec))
        return results

    def get_active_tickets(self) -> list[dict[str, Any]]:
        """Retrieve all active/open tickets from database or cache (metadata only, never complaint text)."""
        try:
            with get_db_session() as session:
                rows = session.execute(
                    select(
                        Ticket.ticket_id, Ticket.priority, Ticket.created_at, Ticket.status,
                        Ticket.priority_score, Ticket.queued_at, Ticket.category, Ticket.building,
                        Ticket.assigned_to_user_id, Ticket.college_id,
                    ).where(Ticket.status.notin_(["RESOLVED", "CLOSED", "Resolved", "Closed", "CANCELLED"]))
                ).all()
                return [
                    {
                        "ticket_id": str(r[0]),
                        "priority": normalize_priority(r[1]),  # None until triaged
                        "created_at": r[2],
                        "status": r[3],
                        "priority_score": float(r[4]) if r[4] is not None else None,
                        "queued_at": r[5],
                        "predicted_category": r[6],
                        "building": r[7],
                        "assigned_technician_id": str(r[8]) if r[8] else None,
                        "college_id": r[9],
                    }
                    for r in rows
                ]
        except Exception as exc:
            self._db_failed("get_active_tickets", exc)

        return [
            rec for rec in _TICKETS_CACHE.values()
            if rec.get("status") not in ("RESOLVED", "CLOSED", "CANCELLED")
        ]

    async def get_ticket_attachments(self, ticket_id: str, attachment_type: str | None = "complaint") -> list[dict[str, Any]]:
        """Attachment metadata for exactly one ticket (no bytes)."""
        int_id = self._parse_id(ticket_id)
        if not int_id:
            return []
        try:
            with get_db_session() as session:
                stmt = select(TicketAttachment).where(TicketAttachment.ticket_id == int_id)
                if attachment_type:
                    stmt = stmt.where(TicketAttachment.attachment_type == attachment_type)
                rows = session.execute(stmt.order_by(TicketAttachment.created_at)).scalars().all()
                return [
                    {
                        "attachment_id": r.attachment_id,
                        "file_name": r.file_name,
                        "mime_type": r.mime_type,
                        "file_size_bytes": r.file_size_bytes,
                        "storage_key": r.storage_key,
                    }
                    for r in rows
                ]
        except Exception as exc:
            self._db_failed("get_ticket_attachments", exc)
            return []

    async def mark_triage_failed(self, ticket_id: str, error: str) -> None:
        """Record that automated triage failed so a human sees the ticket instead of it sitting in AI_PENDING.

        The live tickets_status_check constraint has no TRIAGE_FAILED value, so the ticket moves to
        NEEDS_HUMAN_REVIEW and the failure is recorded as a TRIAGE_FAILED history event."""
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)
        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        previous = t.status
                        t.status = "NEEDS_HUMAN_REVIEW"
                        t.updated_at = now
                        session.add(TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status=previous,
                            new_status="NEEDS_HUMAN_REVIEW",
                            event_type="TRIAGE_FAILED",
                            actor_type="system",
                            note=f"Automated triage failed: {error[:300]}",
                            created_at=now,
                        ))
                        session.commit()
            except Exception as exc:
                self._db_failed("mark_triage_failed", exc)
        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id]["status"] = "NEEDS_HUMAN_REVIEW"
            self.add_ticket_event(ticket_id, "TRIAGE_FAILED", f"Automated triage failed: {error[:300]}")

    async def list_unassigned_queued(self, limit: int = 20) -> list[dict[str, Any]]:
        """Queued tickets nobody has been given yet, best queue position first (metadata only)."""
        try:
            with get_db_session() as session:
                tickets = session.execute(
                    select(Ticket)
                    .where(Ticket.status == "QUEUED", Ticket.assigned_to_user_id.is_(None), Ticket.category.isnot(None))
                    .order_by(desc(Ticket.priority_score).nulls_last(), Ticket.queued_at.asc().nulls_last())
                    .limit(limit)
                ).scalars().all()
                return [
                    {
                        "ticket_id": str(t.ticket_id),
                        "category": t.category,
                        "subcategory": t.assessments[0].subcategory if t.assessments else None,
                        "building": t.building,
                        "priority": normalize_priority(t.priority),
                    }
                    for t in tickets
                ]
        except Exception as exc:
            self._db_failed("list_unassigned_queued", exc)
            return []

    async def list_untriaged_ticket_ids(self, limit: int = 50) -> list[str]:
        """Tickets that never completed triage: still AI_PENDING, or failed (NEEDS_HUMAN_REVIEW with no score)."""
        try:
            with get_db_session() as session:
                rows = session.execute(
                    select(Ticket.ticket_id)
                    .where(
                        (Ticket.status == "AI_PENDING")
                        | ((Ticket.status == "NEEDS_HUMAN_REVIEW") & Ticket.priority_score.is_(None))
                    )
                    .order_by(Ticket.created_at)
                    .limit(limit)
                ).scalars().all()
                return [str(r) for r in rows]
        except Exception as exc:
            self._db_failed("list_untriaged_ticket_ids", exc)
            return [tid for tid, rec in _TICKETS_CACHE.items() if rec.get("status") == "AI_PENDING"][:limit]

    async def update_ticket_triage(
        self,
        ticket_id: str,
        category: str,
        subcategory: str | None,
        severity: str,
        priority: str,
        status: str,
        assigned_tech_id: str | None,
        assigned_tech_name: str | None,
        assessment: Optional[TriageAssessment] = None,
        priority_score: Optional[float] = None,
        classification_confidence: Optional[float] = None,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
    ) -> TicketRead | None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        previous_status = t.status
                        if classification_confidence is not None:
                            t.ai_confidence = round(classification_confidence, 4)
                        t.category = category
                        t.priority = priority
                        if priority_score is not None:
                            t.priority_score = priority_score
                        # Keep the original queue timestamp on re-triage so the ticket does not lose its place.
                        if t.queued_at is None or previous_status in ("AI_PENDING", "TRIAGE_FAILED", "REWORK_REQUESTED"):
                            t.queued_at = now
                        if not assigned_tech_id:
                            if t.assigned_to_user_id and previous_status in ("ASSIGNED", "IN_PROGRESS"):
                                # Re-triage found nobody new (e.g. the current technician is at capacity because of this
                                # very ticket): the ticket keeps its technician and its status instead of being orphaned.
                                status = previous_status
                            else:
                                t.assigned_to_user_id = None  # never leave a QUEUED ticket pointing at a stale assignee
                        t.status = status
                        t.updated_at = now
                        if assigned_tech_id:
                            tech_int = self._parse_id(assigned_tech_id)
                            # Re-triage must not duplicate the assignment or re-notify the same technician.
                            already_assigned = (
                                t.assigned_to_user_id == tech_int
                                and previous_status in ("ASSIGNED", "IN_PROGRESS")
                            )
                            t.assigned_to_user_id = tech_int

                            if not already_assigned:
                                # Record assignment history
                                asgn = TicketAssignment(
                                    ticket_id=t.ticket_id,
                                    technician_user_id=tech_int,
                                    assigned_by_user_id=None,
                                    assigned_at=now,
                                    assignment_status="assigned",
                                )
                                session.add(asgn)

                                ref_images = [
                                    {
                                        "attachment_id": str(att.attachment_id),
                                        "file_name": att.file_name,
                                        "mime_type": att.mime_type,
                                        "url": f"/api/v1/tickets/{t.ticket_id}/attachments/{att.attachment_id}/file",
                                    }
                                    for att in (t.attachments or [])
                                    if (att.mime_type or "").startswith("image/")
                                ]
                                msg_suffix = f" Includes {len(ref_images)} reference image(s)." if ref_images else ""

                                # Record technician notification in outbox
                                notif = NotificationOutbox(
                                    ticket_id=t.ticket_id,
                                    recipient_user_id=tech_int,
                                    notification_type="NEW_ASSIGNMENT",
                                    payload={
                                        "ticket_id": str(t.ticket_id),
                                        "category": category,
                                        "subcategory": subcategory,
                                        "priority": priority,
                                        "priority_score": float(priority_score) if priority_score is not None else None,
                                        "building": t.building,
                                        "complaint_excerpt": t.description[:120] if t.description else "",
                                        "reference_images": ref_images,
                                        "has_images": len(ref_images) > 0,
                                        "message": f"New ticket #{t.ticket_id} ({category} - {priority}) assigned in {t.building}.{msg_suffix}",
                                    },
                                    delivery_status="pending",
                                    created_at=now,
                                )
                                session.add(notif)

                        # Record in history
                        hist = TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status=previous_status,
                            new_status=status,
                            event_type="AUTO_TRIAGED",
                            actor_type="system",
                            note=f"Triaged as {category} ({priority}) with score {priority_score}. Severity: {severity}.",
                            created_at=now,
                        )
                        session.add(hist)

                        # Record assessment if available
                        if assessment:
                            db_assessment = TicketAIAssessment(
                                ticket_id=t.ticket_id,
                                classifier_category=category,
                                subcategory=subcategory,
                                classification_confidence=classification_confidence,
                                severity=severity,
                                priority_proposed=priority,
                                priority_confidence_level=assessment.confidence_level,
                                urgency=assessment.urgency,
                                impact_scope=assessment.impact_scope,
                                evidence=[e.model_dump() for e in assessment.evidence],
                                missing_information=assessment.missing_information,
                                suggested_fix=assessment.suggested_fix,
                                requires_human_review=assessment.requires_human_review,
                                model_name=(model_name or "")[:100] or None,  # varchar(100)
                                model_version=(model_version or "")[:50] or None,  # varchar(50)
                                assessment_json=assessment.model_dump(),
                                status="COMPLETED",
                                created_at=now,
                                completed_at=now,
                            )
                            session.add(db_assessment)

                        session.commit()
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({
                "predicted_category": category,
                "predicted_subcategory": subcategory,
                "severity": severity,
                "priority": priority,
                "status": status,
                "assigned_technician_id": assigned_tech_id,
                "assigned_technician_name": assigned_tech_name,
            })
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="AUTO_TRIAGED",
                notes=f"Triaged as {category} with priority {priority}. Status -> {status}",
                actor="System Triage",
            )
            return self._build_ticket_read(ticket_id, _TICKETS_CACHE[ticket_id])

        return await self.get_ticket(ticket_id)

    async def assign_technician(
        self,
        ticket_id: str,
        technician_id: str,
        actor: str = "Admin Dispatcher",
    ) -> TicketRead | None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)
        tech_int = self._parse_id(technician_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        old_status = t.status
                        t.assigned_to_user_id = tech_int
                        t.status = "ASSIGNED"
                        t.updated_at = now

                        # Record Assignment history
                        if tech_int:
                            assignment = TicketAssignment(
                                ticket_id=t.ticket_id,
                                technician_user_id=tech_int,
                                assigned_at=now,
                                assignment_status="assigned",
                            )
                            session.add(assignment)

                        # Record in history
                        hist = TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status=old_status,
                            new_status="ASSIGNED",
                            event_type="TECHNICIAN_ASSIGNED",
                            actor_type="admin",
                            note=f"Assigned to technician #{technician_id} by {actor}.",
                            created_at=now,
                        )
                        session.add(hist)

                        # Queue notification
                        if tech_int:
                            ref_images = [
                                {
                                    "attachment_id": str(att.attachment_id),
                                    "file_name": att.file_name,
                                    "mime_type": att.mime_type,
                                    "url": f"/api/v1/tickets/{t.ticket_id}/attachments/{att.attachment_id}/file",
                                }
                                for att in (t.attachments or [])
                                if (att.mime_type or "").startswith("image/")
                            ]
                            notif = NotificationOutbox(
                                ticket_id=t.ticket_id,
                                recipient_user_id=tech_int,
                                notification_type="TICKET_ASSIGNED",
                                payload={
                                    "ticket_id": str(t.ticket_id),
                                    "priority": t.priority,
                                    "category": t.category,
                                    "building": t.building,
                                    "reference_images": ref_images,
                                    "has_images": len(ref_images) > 0,
                                    "message": f"Assigned ticket #{t.ticket_id} by {actor}. {'Includes ' + str(len(ref_images)) + ' reference image(s).' if ref_images else ''}",
                                },
                                delivery_status="pending",
                                created_at=now,
                            )
                            session.add(notif)

                        session.commit()
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({
                "assigned_technician_id": technician_id,
                "status": "ASSIGNED",
            })
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="TECHNICIAN_ASSIGNED",
                notes=f"Assigned to technician #{technician_id} by {actor}.",
                actor=actor,
            )

        return await self.get_ticket(ticket_id)

    async def submit_work_report(
        self,
        ticket_id: str,
        action_notes: str,
        action_images: list[str] | None = None,
        actor: str = "Technician",
    ) -> TicketRead | None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        old_status = t.status
                        t.resolution = action_notes
                        t.resolution_submitted_at = now
                        t.status = "USER_VERIFICATION"
                        t.updated_at = now

                        # Record resolution attempt
                        if t.assigned_to_user_id:
                            attempt = TicketResolutionAttempt(
                                ticket_id=t.ticket_id,
                                technician_user_id=t.assigned_to_user_id,
                                resolution_summary=action_notes,
                                submitted_at=now,
                                verification_status="pending",
                            )
                            session.add(attempt)

                        # Record history
                        hist = TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status=old_status,
                            new_status="USER_VERIFICATION",
                            event_type="RESOLUTION_SUBMITTED",
                            actor_type="technician",
                            note=f"Work report submitted: {action_notes}",
                            created_at=now,
                        )
                        session.add(hist)
                        session.commit()
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({
                "action_notes": action_notes,
                "status": "USER_VERIFICATION",
            })
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="RESOLUTION_SUBMITTED",
                notes=action_notes,
                actor=actor,
            )

        return await self.get_ticket(ticket_id)

    async def confirm_resolution(
        self,
        ticket_id: str,
        actor: str = "Complainant",
    ) -> TicketRead | None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        t.status = "RESOLVED"
                        t.resolution_confirmed_at = now
                        t.updated_at = now

                        # Update resolution attempt status
                        attempts = session.execute(
                            select(TicketResolutionAttempt)
                            .where(TicketResolutionAttempt.ticket_id == t.ticket_id)
                            .order_by(desc(TicketResolutionAttempt.submitted_at))
                        ).scalars().all()
                        if attempts:
                            attempts[0].verification_status = "confirmed"
                            attempts[0].verified_at = now

                        # Add to ticket_solutions for knowledge base
                        sol = TicketSolution(
                            ticket_id=t.ticket_id,
                            problem_summary=t.description[:250],
                            resolution=t.resolution or "Resolved as confirmed by complainant",
                            category=t.category,
                            created_at=now,
                        )
                        session.add(sol)

                        # Record history
                        hist = TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status="USER_VERIFICATION",
                            new_status="RESOLVED",
                            event_type="RESOLUTION_CONFIRMED",
                            actor_type="complainant",
                            note=f"Resolution confirmed by {actor}.",
                            created_at=now,
                        )
                        session.add(hist)
                        session.commit()
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({
                "status": "RESOLVED",
                "resolution_confirmed_at": now,
            })
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="RESOLUTION_CONFIRMED",
                notes=f"Resolution verified and confirmed by {actor}.",
                actor=actor,
            )

        return await self.get_ticket(ticket_id)

    async def request_re_evaluation(
        self,
        ticket_id: str,
        reason: str,
        actor: str = "Complainant",
    ) -> TicketRead | None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        t.status = "REWORK_REQUESTED"
                        t.re_evaluation_reason = reason
                        t.updated_at = now

                        attempts = session.execute(
                            select(TicketResolutionAttempt)
                            .where(TicketResolutionAttempt.ticket_id == t.ticket_id)
                            .order_by(desc(TicketResolutionAttempt.submitted_at))
                        ).scalars().all()
                        if attempts:
                            attempts[0].verification_status = "rejected"
                            attempts[0].rework_reason = reason
                            attempts[0].verified_at = now

                        # Record history
                        hist = TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status="USER_VERIFICATION",
                            new_status="REWORK_REQUESTED",
                            event_type="REWORK_REQUESTED",
                            actor_type="complainant",
                            note=f"Re-evaluation requested: {reason}",
                            created_at=now,
                        )
                        session.add(hist)
                        session.commit()
            except Exception as exc:
                self._db_failed("db", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({
                "status": "REWORK_REQUESTED",
                "re_evaluation_reason": reason,
            })
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="REWORK_REQUESTED",
                notes=f"Issue not resolved: {reason}",
                actor=actor,
            )

        return await self.get_ticket(ticket_id)

    # In-memory & helper operations
    def save_assessment(self, ticket_id: str, assessment: TriageAssessment) -> None:
        _ASSESSMENTS_CACHE[ticket_id] = assessment

    def get_assessment(self, ticket_id: str) -> Optional[TriageAssessment]:
        cached = _ASSESSMENTS_CACHE.get(ticket_id)
        if cached:
            return cached
        int_id = self._parse_id(ticket_id)
        if not int_id:
            return None
        try:
            with get_db_session() as session:
                row = session.execute(
                    select(TicketAIAssessment)
                    .where(TicketAIAssessment.ticket_id == int_id, TicketAIAssessment.assessment_json.isnot(None))
                    .order_by(desc(TicketAIAssessment.created_at))
                ).scalars().first()
                if row:
                    assessment = TriageAssessment.model_validate(row.assessment_json)
                    _ASSESSMENTS_CACHE[ticket_id] = assessment
                    return assessment
        except Exception as exc:
            self._db_failed("get_assessment", exc)
        return None

    async def override_priority(
        self,
        ticket_id: str,
        priority: str,
        reason: str,
        actor: str = "Administrator",
    ) -> TicketRead | None:
        """Admin override of priority; the derived severity is recorded as a new, versioned assessment."""
        now = datetime.now(timezone.utc)
        priority = priority.upper()
        if priority not in PRIORITY_TO_SEVERITY:
            raise ValueError("priority must be one of P1, P2, P3, P4")
        severity = PRIORITY_TO_SEVERITY[priority]
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    t = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
                    if t:
                        old_priority = t.priority
                        t.priority = priority
                        t.updated_at = now
                        session.add(TicketHistory(
                            ticket_id=t.ticket_id,
                            old_status=t.status,
                            new_status=t.status,
                            event_type="PRIORITY_OVERRIDE",
                            actor_type="admin",
                            note=f"Priority overridden by {actor}: {reason}",
                            old_value={"priority": old_priority},
                            new_value={"priority": priority},
                            created_at=now,
                        ))
                        previous = t.assessments[0] if t.assessments else None
                        session.add(TicketAIAssessment(
                            ticket_id=t.ticket_id,
                            classifier_category=t.category,
                            subcategory=previous.subcategory if previous else None,
                            classification_confidence=previous.classification_confidence if previous else None,
                            severity=severity,
                            priority_proposed=priority,
                            priority_confidence_level="high",
                            urgency=previous.urgency if previous else None,
                            impact_scope=previous.impact_scope if previous else None,
                            evidence=previous.evidence if previous else [],
                            missing_information=previous.missing_information if previous else [],
                            requires_human_review=False,
                            model_name="admin-override",
                            status="ADMIN_OVERRIDE",
                            created_at=now,
                            completed_at=now,
                        ))
                        session.commit()
            except Exception as exc:
                self._db_failed("override_priority", exc)

        if ticket_id in _TICKETS_CACHE:
            _TICKETS_CACHE[ticket_id].update({"priority": priority, "severity": severity})
            self.add_ticket_event(
                ticket_id=ticket_id,
                event_type="PRIORITY_OVERRIDE",
                notes=f"Priority overridden by {actor}: {reason}",
                actor=actor,
            )
            return self._build_ticket_read(ticket_id, _TICKETS_CACHE[ticket_id])

        return await self.get_ticket(ticket_id)

    def add_ticket_event(
        self,
        ticket_id: str,
        event_type: str,
        notes: str,
        actor: str = "System",
    ) -> None:
        if ticket_id not in _TICKETS_CACHE:
            return
        if "timeline" not in _TICKETS_CACHE[ticket_id]:
            _TICKETS_CACHE[ticket_id]["timeline"] = []
        _TICKETS_CACHE[ticket_id]["timeline"].append(
            TimelineItem(
                timestamp=datetime.now(timezone.utc).isoformat(),
                status=event_type,
                actor=actor,
                note=notes,
            )
        )

    async def get_case_memory(self, ticket_id: str) -> CaseMemorySchema | None:
        int_id = self._parse_id(ticket_id)
        if int_id:
            try:
                with get_db_session() as session:
                    mem = session.execute(
                        select(TicketCaseMemory).where(TicketCaseMemory.ticket_id == int_id)
                    ).scalar_one_or_none()
                    if mem:
                        facts_list = [f.get("observation", "") for f in (mem.established_facts or []) if isinstance(f, dict)]
                        return CaseMemorySchema(
                            ticket_id=str(mem.ticket_id),
                            case_facts=CaseFacts(
                                reported_service="IT Support",
                                observed_impact="",
                                confirmed_facts=facts_list,
                                latest_ticket_status="ACTIVE",
                            ),
                            relevant_record_ids=[],
                            updated_at=mem.last_triaged_at.isoformat() if mem.last_triaged_at else "",
                        )
            except Exception as exc:
                self._db_failed("db", exc)

        return _CASE_MEMORY_CACHE.get(ticket_id)

    async def update_case_memory(self, ticket_id: str, assessment: TriageAssessment) -> None:
        now = datetime.now(timezone.utc)
        int_id = self._parse_id(ticket_id)

        if int_id:
            try:
                with get_db_session() as session:
                    mem = session.execute(
                        select(TicketCaseMemory).where(TicketCaseMemory.ticket_id == int_id)
                    ).scalar_one_or_none()
                    if not mem:
                        mem = TicketCaseMemory(ticket_id=int_id)
                        session.add(mem)

                    existing_facts = mem.established_facts or []
                    for ev in assessment.evidence[:3]:
                        existing_facts.append(ev.model_dump())
                    mem.established_facts = existing_facts
                    mem.missing_facts = [{"missing": m} for m in assessment.missing_information]
                    mem.last_triaged_at = now
                    session.commit()
            except Exception as exc:
                self._db_failed("db", exc)


tickets_repo = TicketsRepository()
