"""
Mail notifications for complaints that arrived by email, delivered through the notifications_outbox.

The EMAIL_ACK row is written in the same transaction as the ticket and records the original message
(address, Message-ID, IMAP UID). It is therefore also the record that a mail became a ticket: it is
used for duplicate detection, for the restart position, and to find where to send later updates.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Integer, cast, func, select

from app.config import settings
from app.db.session import get_db_session
from app.models.history import TicketHistory
from app.models.notification import NotificationOutbox
from app.models.ticket import Ticket

logger = logging.getLogger(__name__)

EMAIL_ACK = "EMAIL_ACK"
EMAIL_ASSIGNED = "EMAIL_ASSIGNED"
EMAIL_TYPES = (EMAIL_ACK, EMAIL_ASSIGNED)


def _reply_subject(subject: str) -> str:
    subject = subject or "complaint"
    return subject if subject.lower().startswith("re:") else f"Re: {subject}"


def _greeting(name: str | None) -> str:
    return f"Hello {name}," if name else "Hello,"


def build_ack_row(ticket: Ticket, recipient_user_id: int, *, to: str, name: str | None, subject: str,
                  message_id: str, imap_uid: int) -> NotificationOutbox:
    body = (
        f"{_greeting(name)}\n\n"
        f"We have received your complaint and registered it as ticket #{ticket.ticket_id}. We will rectify it.\n\n"
        "IT Helpdesk"
    )
    return NotificationOutbox(
        ticket_id=ticket.ticket_id,
        recipient_user_id=recipient_user_id,
        notification_type=EMAIL_ACK,
        payload={
            "to": to,
            "name": name,
            "subject": _reply_subject(subject),
            "body": body,
            "in_reply_to": message_id,
            "message_id": message_id,
            "imap_uid": imap_uid,
        },
        delivery_status="pending",
    )


def _origin(session, ticket_int_id: int) -> NotificationOutbox | None:
    return session.execute(
        select(NotificationOutbox)
        .where(NotificationOutbox.ticket_id == ticket_int_id, NotificationOutbox.notification_type == EMAIL_ACK)
        .order_by(NotificationOutbox.event_id)
    ).scalars().first()


def is_email_ticket(ticket_id: str) -> bool:
    if not str(ticket_id).isdigit():
        return False
    with get_db_session() as session:
        return _origin(session, int(ticket_id)) is not None


def already_received(message_id: str) -> bool:
    with get_db_session() as session:
        return session.execute(
            select(NotificationOutbox.event_id).where(
                NotificationOutbox.notification_type == EMAIL_ACK,
                NotificationOutbox.payload["message_id"].astext == message_id,
            )
        ).first() is not None


def last_processed_uid(at_most: int | None = None) -> int | None:
    """Highest IMAP UID that already became a ticket (ignoring UIDs above `at_most`, i.e. from another mailbox)."""
    with get_db_session() as session:
        uid = cast(NotificationOutbox.payload["imap_uid"].astext, Integer)
        query = select(func.max(uid)).where(NotificationOutbox.notification_type == EMAIL_ACK)
        if at_most is not None:
            query = query.where(uid <= at_most)
        return session.execute(query).scalar()


def queue_assigned_mail(ticket_id: str, technician_name: str | None, priority: str | None) -> None:
    """Tell an email complainant who is handling their ticket. No-op for web tickets; never raises."""
    if not technician_name or not str(ticket_id).isdigit():
        return
    try:
        with get_db_session() as session:
            origin = _origin(session, int(ticket_id))
            if origin is None:
                return
            already = session.execute(
                select(NotificationOutbox.event_id).where(
                    NotificationOutbox.ticket_id == int(ticket_id),
                    NotificationOutbox.notification_type == EMAIL_ASSIGNED,
                    NotificationOutbox.payload["technician_name"].astext == technician_name,
                )
            ).first()
            if already:
                return
            p = origin.payload
            body = (
                f"{_greeting(p.get('name'))}\n\n"
                f"Your complaint (ticket #{ticket_id}) has been assigned to {technician_name}"
                f"{f' (priority {priority})' if priority else ''}. They will contact you if they need more details.\n\n"
                "IT Helpdesk"
            )
            session.add(NotificationOutbox(
                ticket_id=int(ticket_id),
                recipient_user_id=origin.recipient_user_id,
                notification_type=EMAIL_ASSIGNED,
                payload={**{k: p[k] for k in ("to", "name", "subject", "in_reply_to")},
                         "body": body, "technician_name": technician_name},
                delivery_status="pending",
            ))
            session.commit()
    except Exception:
        logger.exception("Could not queue the assignment email for ticket %s", ticket_id)


def pending_rows(limit: int = 50) -> list[dict[str, Any]]:
    with get_db_session() as session:
        rows = session.execute(
            select(NotificationOutbox)
            .where(NotificationOutbox.notification_type.in_(EMAIL_TYPES), NotificationOutbox.delivery_status == "pending")
            .order_by(NotificationOutbox.event_id)
            .limit(limit)
        ).scalars().all()
        return [
            {"event_id": r.event_id, "ticket_id": r.ticket_id, "type": r.notification_type, **(r.payload or {})}
            for r in rows
        ]


def mark_sent(event_id: int) -> None:
    now = datetime.now(timezone.utc)
    with get_db_session() as session:
        row = session.get(NotificationOutbox, event_id)
        row.delivery_status = "delivered"
        row.sent_at = now
        row.attempt_count = (row.attempt_count or 0) + 1
        ticket = session.get(Ticket, row.ticket_id) if row.ticket_id else None
        if ticket:
            session.add(TicketHistory(
                ticket_id=ticket.ticket_id,
                old_status=ticket.status,
                new_status=ticket.status,
                event_type=f"{row.notification_type}_SENT",
                actor_type="system",
                note=f"{'Acknowledgement' if row.notification_type == EMAIL_ACK else 'Assignment'} email sent to {row.payload.get('to')}",
                created_at=now,
            ))
        session.commit()


def mark_failed(event_id: int, error: str) -> None:
    with get_db_session() as session:
        row = session.get(NotificationOutbox, event_id)
        row.attempt_count = (row.attempt_count or 0) + 1
        row.last_error = error[:500]
        if row.attempt_count >= settings.EMAIL_MAX_SEND_ATTEMPTS:
            row.delivery_status = "failed"
        session.commit()
