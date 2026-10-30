"""
Email intake worker.

Every EMAIL_POLL_SECONDS:
  1. fetch mail newer than the last processed UID;
  2. for each mail whose subject is exactly EMAIL_COMPLAINT_SUBJECT (case-insensitive):
     create the complainant (if new) and the ticket + EMAIL_ACK outbox row in one transaction,
     send "We will rectify it", run triage with the LLM choosing the category,
     then send "assigned to <technician>" (queued by triage when a technician was found);
  3. deliver any other pending email notifications (retries, later auto-dispatch assignments).

Each ticket is triaged on its own, with no state carried between mails.
"""

import asyncio
import contextlib
import imaplib
import logging
import re
import smtplib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select

from app.config import settings
from app.db.session import get_db_session
from app.integrations.mail_client import InboundMessage
from app.models.history import TicketHistory
from app.models.user import User
from app.repositories.tickets import tickets_repo
from app.schemas.ticket import TicketCreate
from app.services import email_notifications

logger = logging.getLogger(__name__)

listener_state: dict[str, Any] = {"status": "disabled", "last_poll": None, "last_error": None, "tickets_created": 0}

MAX_HANDLE_ATTEMPTS = 3
SYSTEM_SENDERS = ("mailer-daemon", "postmaster", "no-reply", "noreply", "do-not-reply")


def extract_building(body: str) -> str:
    match = re.search(r"(?im)^\s*(?:building|location|block)\s*[:\-]\s*(.+?)\s*$", body)
    return match.group(1)[:100] if match and len(match.group(1).strip()) >= 2 else "Not specified"


def ignore_reason(msg: InboundMessage) -> str | None:
    """Why a mail must not become a ticket (None = it is a complaint). Also stops mail loops."""
    if msg.subject.strip().lower() != settings.EMAIL_COMPLAINT_SUBJECT.strip().lower():
        return "subject is not a complaint"
    if msg.is_auto_generated:
        return "auto-generated mail"
    local = msg.from_address.split("@")[0]
    if not msg.from_address or any(local.startswith(s) for s in SYSTEM_SENDERS):
        return "system sender"
    if len(msg.body.strip()) < 5:
        return "empty body"
    return None


def ensure_user(address: str, name: str) -> int:
    with get_db_session() as session:
        user = session.execute(select(User).where(func.lower(User.email) == address.lower())).scalars().first()
        if user is None:
            display = (name or address.split("@")[0]).strip()
            user = User(full_name=display[:100] if len(display) >= 2 else address[:100], email=address, role="User", is_active=True)
            session.add(user)
            session.commit()
        return user.user_id


class EmailListener:
    def __init__(self, client: Any, triage: Any = None):
        self.client = client
        if triage is None:
            from app.services.triage_service import triage_service

            triage = triage_service
        self.triage = triage
        self._last_uid: int | None = None
        self._failures: dict[int, int] = {}

    async def _start_uid(self) -> int:
        if self._last_uid is None:
            latest = await asyncio.to_thread(self.client.latest_uid)
            # UIDs above the mailbox's newest belong to a different mailbox/UIDVALIDITY (waiting for UIDs above
            # them would silently ignore every new mail), so they are ignored.
            stored = email_notifications.last_processed_uid(at_most=latest)
            self._last_uid = stored if stored is not None else latest
            logger.info("Email listener starting after UID %s", self._last_uid)
        return self._last_uid

    async def poll_once(self) -> list[str]:
        after = await self._start_uid()
        created: list[str] = []
        for msg in await asyncio.to_thread(self.client.fetch_new, after):
            try:
                ticket_id = await self.handle_message(msg)
            except Exception as exc:
                attempts = self._failures.get(msg.uid, 0) + 1
                self._failures[msg.uid] = attempts
                logger.exception("Email UID %s failed (attempt %s)", msg.uid, attempts)
                if attempts < MAX_HANDLE_ATTEMPTS:
                    break  # retry this mail next poll, keep order
                logger.error("Giving up on email UID %s after %s attempts: %s", msg.uid, attempts, exc)
                ticket_id = None
            self._last_uid = max(self._last_uid or 0, msg.uid)
            if ticket_id:
                created.append(ticket_id)
        await self.deliver_pending()
        return created

    async def handle_message(self, msg: InboundMessage) -> str | None:
        reason = ignore_reason(msg)
        if reason:
            logger.info("Ignoring email UID %s from %s: %s", msg.uid, msg.from_address, reason)
            return None
        if email_notifications.already_received(msg.message_id):
            logger.info("Email %s already became a ticket; skipping", msg.message_id)
            return None

        user_id = ensure_user(msg.from_address, msg.from_name)
        data = TicketCreate(
            complaint_text=msg.body[:5000],
            building=extract_building(msg.body),
            complainant_name=(msg.from_name or msg.from_address)[:100],
            complainant_id=msg.from_address[:100],
        )

        def add_email_rows(session, ticket):
            session.add(email_notifications.build_ack_row(
                ticket, user_id, to=msg.from_address, name=msg.from_name or None, subject=msg.subject,
                message_id=msg.message_id, imap_uid=msg.uid,
            ))
            session.add(TicketHistory(
                ticket_id=ticket.ticket_id, old_status="AI_PENDING", new_status="AI_PENDING",
                event_type="EMAIL_RECEIVED", actor_type="complainant",
                note=f"Complaint received by email from {msg.from_address}",
                created_at=datetime.now(timezone.utc),
            ))

        ticket = await tickets_repo.create_ticket(data, raised_by_user_id=user_id, on_created=add_email_rows)
        if not str(ticket.ticket_id).isdigit():
            raise RuntimeError("ticket was not stored in the database; email will be retried")
        listener_state["tickets_created"] += 1
        logger.info("Email UID %s from %s -> ticket %s", msg.uid, msg.from_address, ticket.ticket_id)

        for file_name, data_bytes in msg.images:
            from app.api.v1.endpoints.attachments import AttachmentRejected, store_attachment

            try:
                store_attachment(int(ticket.ticket_id), file_name, data_bytes, "complaint")
            except AttachmentRejected as exc:
                logger.warning("Skipped attachment %s on ticket %s: %s", file_name, ticket.ticket_id, exc.detail)

        await self.deliver_pending()  # "We will rectify it" goes out before the (slower) triage
        await self.triage.triage_ticket_safe(ticket.ticket_id, category_source="llm")
        await self.deliver_pending()  # "assigned to <technician>" if triage found one
        return ticket.ticket_id

    async def deliver_pending(self) -> int:
        sent = 0
        for row in email_notifications.pending_rows():
            try:
                await asyncio.to_thread(self.client.send, row["to"], row["subject"], row["body"], row.get("in_reply_to"))
                email_notifications.mark_sent(row["event_id"])
                sent += 1
            except Exception as exc:
                logger.warning("Sending %s for ticket %s failed: %s", row["type"], row["ticket_id"], exc)
                email_notifications.mark_failed(row["event_id"], f"{type(exc).__name__}: {exc}")
        return sent

    async def run_forever(self) -> None:
        listener_state["status"] = "running"
        network_failures = 0
        while True:
            delay = max(2, settings.EMAIL_POLL_SECONDS)
            try:
                await self.poll_once()
                listener_state["last_error"] = None
                network_failures = 0
            except asyncio.CancelledError:
                raise
            except (OSError, imaplib.IMAP4.abort, smtplib.SMTPException) as exc:
                # Gmail/network hiccup (timeouts, dropped connections): not a bug, retry with a growing pause.
                network_failures += 1
                delay = min(120, delay * (2 ** min(network_failures, 4)))
                logger.warning("Mail server unreachable (%s: %s); attempt %s, retrying in %ss",
                               type(exc).__name__, exc, network_failures, delay)
                listener_state["last_error"] = f"{type(exc).__name__}: {exc}"[:300]
            except Exception as exc:
                logger.exception("Email poll failed")
                listener_state["last_error"] = f"{type(exc).__name__}: {exc}"[:300]
            listener_state["last_poll"] = datetime.now(timezone.utc).isoformat()
            await asyncio.sleep(delay)


def start_email_listener() -> asyncio.Task | None:
    if not settings.EMAIL_ENABLED:
        listener_state["status"] = "disabled"
        return None
    if not settings.EMAIL_ADDRESS or not settings.EMAIL_APP_PASSWORD:
        listener_state["status"] = "error"
        listener_state["last_error"] = "EMAIL_ADDRESS / EMAIL_APP_PASSWORD not set"
        logger.error("EMAIL_ENABLED is true but EMAIL_ADDRESS / EMAIL_APP_PASSWORD are missing")
        return None
    from app.integrations.mail_client import ImapSmtpMailClient

    logger.info("Starting email listener for %s (subject '%s')", settings.EMAIL_ADDRESS, settings.EMAIL_COMPLAINT_SUBJECT)
    return asyncio.create_task(EmailListener(ImapSmtpMailClient()).run_forever(), name="email-listener")


async def stop_email_listener(task: asyncio.Task | None) -> None:
    if task is None:
        return
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    listener_state["status"] = "stopped"
