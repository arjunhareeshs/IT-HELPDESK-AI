"""
Email intake: "complaint" mail -> ticket -> "We will rectify it" -> LLM category -> technician ->
"assigned to <technician>". Uses a fake mailbox (no network) and a scripted LLM; real DB and real
technician matching.
"""

import uuid
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pytest
from sqlalchemy import delete, select

from app.ai import vision
from app.ai.classification.llm_classifier import LLMCategory
from app.config import settings
from app.db.session import get_db_session
from app.integrations.mail_client import InboundMessage, parse_message
from app.models import (
    AIToolCallAudit, NotificationOutbox, Ticket, TicketAIAssessment, TicketAssignment, TicketAttachment,
    TicketCaseMemory, TicketComment, TicketHistory, TicketIncidentLink, TicketResolutionAttempt, TicketSolution, User,
)
from app.services import triage_service as triage_module
from app.services.assignment_service import assignment_service
from app.workers.email_listener import EmailListener, extract_building, ignore_reason

from tests.unit.test_pipeline_flow import PNG_BYTES, FakeVision, ScriptedModel

DOMAIN = "mail-test.invalid"


DEFAULT_ANSWER = {"category": "network", "subcategory": "wireless", "confidence": "high", "reason": "wifi"}
CATEGORY_SCRIPT = {"answer": dict(DEFAULT_ANSWER), "raises": False}


class EmailScriptedModel(ScriptedModel):
    """Scripted LLM that also answers the category question (answer controlled by CATEGORY_SCRIPT)."""

    def with_structured_output(self, schema, **kwargs):
        if schema is LLMCategory:
            model = self

            class _Cat:
                async def ainvoke(self, messages, *a, **k):
                    model.structured_seen.append("\n".join(str(m.content) for m in messages))
                    if CATEGORY_SCRIPT["raises"]:
                        raise RuntimeError("LLM unavailable")
                    return LLMCategory(**CATEGORY_SCRIPT["answer"])

            return _Cat()
        return super().with_structured_output(schema, **kwargs)


class FakeMailbox:
    def __init__(self, latest: int = 100):
        self.latest = latest
        self.inbox: list[InboundMessage] = []
        self.sent: list[dict] = []
        self.fail_sends = False

    def latest_uid(self) -> int:
        return self.latest

    def fetch_new(self, after_uid: int) -> list[InboundMessage]:
        return [m for m in self.inbox if m.uid > after_uid]

    def send(self, to, subject, body, in_reply_to=None):
        if self.fail_sends:
            raise ConnectionError("SMTP down")
        self.sent.append({"to": to, "subject": subject, "body": body, "in_reply_to": in_reply_to})
        return f"<sent-{len(self.sent)}@test>"

    def deliver(self, uid: int, *, subject="complaint", body="The Wi-Fi in the Science Block lab keeps dropping.\nBuilding: Science Block",
                sender=None, name="Asha Rao", auto=False, images=None, message_id=None) -> InboundMessage:
        msg = InboundMessage(
            uid=uid,
            message_id=message_id or f"<{uuid.uuid4().hex}@{DOMAIN}>",
            from_address=sender or f"asha.{uuid.uuid4().hex[:6]}@{DOMAIN}",
            from_name=name,
            subject=subject,
            body=body,
            is_auto_generated=auto,
            images=images or [],
        )
        self.inbox.append(msg)
        return msg


@pytest.fixture
def mailbox(monkeypatch, test_technicians):
    models: list[EmailScriptedModel] = []

    def factory(*a, **k):
        m = EmailScriptedModel(seen=[], structured_seen=[])
        models.append(m)
        return m

    monkeypatch.setattr(triage_module, "make_triage_model", factory)
    monkeypatch.setattr(vision, "make_vision_model", lambda: FakeVision())
    box = FakeMailbox()
    box.models = models
    CATEGORY_SCRIPT.update(answer=dict(DEFAULT_ANSWER), raises=False)
    yield box
    CATEGORY_SCRIPT.update(answer=dict(DEFAULT_ANSWER), raises=False)

    with get_db_session() as session:
        users = list(session.execute(select(User.user_id).where(User.email.like(f"%@{DOMAIN}"))).scalars())
        ids = list(session.execute(select(Ticket.ticket_id).where(Ticket.raised_by_user_id.in_(users))).scalars()) if users else []
        for model in (AIToolCallAudit, TicketHistory, TicketAIAssessment, TicketAttachment, TicketAssignment,
                      TicketResolutionAttempt, TicketCaseMemory, NotificationOutbox, TicketComment,
                      TicketIncidentLink, TicketSolution):
            if ids:
                session.execute(delete(model).where(model.ticket_id.in_(ids)))
        if ids:
            session.execute(delete(Ticket).where(Ticket.ticket_id.in_(ids)))
        if users:
            session.execute(delete(User).where(User.user_id.in_(users)))
        session.commit()


def listener_after(box: FakeMailbox, uid: int) -> EmailListener:
    """Listener positioned just before the test's mails (independent of real mail already in the DB)."""
    listener = EmailListener(box)
    listener._last_uid = uid
    return listener


def ticket_row(ticket_id):
    with get_db_session() as session:
        t = session.get(Ticket, int(ticket_id))
        events = list(session.execute(select(TicketHistory.event_type).where(TicketHistory.ticket_id == t.ticket_id)).scalars())
        outbox = session.execute(select(NotificationOutbox).where(NotificationOutbox.ticket_id == t.ticket_id)
                                 .order_by(NotificationOutbox.event_id)).scalars().all()
        assessment = session.execute(select(TicketAIAssessment).where(TicketAIAssessment.ticket_id == t.ticket_id)).scalars().first()
        atts = session.execute(select(TicketAttachment).where(TicketAttachment.ticket_id == t.ticket_id)).scalars().all()
        assignee = session.get(User, t.assigned_to_user_id) if t.assigned_to_user_id else None
        complainant = session.get(User, t.raised_by_user_id)
        return {
            "t": t, "events": events, "outbox": [(o.notification_type, o.delivery_status) for o in outbox],
            "model_version": assessment.model_version if assessment else None,
            "attachments": len(atts), "assignee": assignee.full_name if assignee else None,
            "complainant_email": complainant.email,
        }


# ---------------------------------------------------------------------------------------------
# Parsing and filtering (pure)
# ---------------------------------------------------------------------------------------------

def test_parse_multipart_mail_with_image_and_quoted_reply():
    mime = MIMEMultipart()
    mime["From"] = '"Asha Rao" <Asha.Rao@Example.com>'
    mime["Subject"] = "=?utf-8?q?Complaint?="
    mime["Message-ID"] = "<abc@example.com>"
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText("Printer jams on level 3.\n\n> old quoted text\nOn Mon, Bob wrote:\nolder thread", "plain"))
    alt.attach(MIMEText("<p>Printer jams on level 3.</p>", "html"))
    mime.attach(alt)
    img = MIMEImage(PNG_BYTES, _subtype="png")
    img.add_header("Content-Disposition", "attachment", filename="jam.png")
    mime.attach(img)

    msg = parse_message(7, mime.as_bytes())
    assert msg.from_address == "asha.rao@example.com" and msg.from_name == "Asha Rao"
    assert msg.subject == "Complaint" and msg.message_id == "<abc@example.com>"
    assert msg.body == "Printer jams on level 3."  # quoted reply and older thread dropped
    assert msg.images == [("jam.png", PNG_BYTES)] and not msg.is_auto_generated


def test_parse_html_only_mail_and_auto_reply_header():
    mime = MIMEText("<div>Projector&nbsp;dead<br>Room 12</div>", "html")
    mime["From"] = "x@example.com"
    mime["Subject"] = "complaint"
    mime["Auto-Submitted"] = "auto-replied"
    msg = parse_message(8, mime.as_bytes())
    assert "Projector" in msg.body and "Room 12" in msg.body and "<" not in msg.body
    assert msg.is_auto_generated


@pytest.mark.parametrize("subject,expected", [
    ("complaint", None), ("COMPLAINT ", None), ("Complaint", None),
    ("Re: complaint", "subject is not a complaint"), ("hello", "subject is not a complaint"),
])
def test_subject_filter(subject, expected):
    box = FakeMailbox()
    assert ignore_reason(box.deliver(1, subject=subject)) == expected


def test_loop_protection_and_empty_mail_are_ignored():
    box = FakeMailbox()
    assert ignore_reason(box.deliver(1, auto=True)) == "auto-generated mail"
    assert ignore_reason(box.deliver(2, sender="mailer-daemon@googlemail.com")) == "system sender"
    assert ignore_reason(box.deliver(3, body="  ")) == "empty body"


def test_building_line_is_read_from_the_body():
    assert extract_building("Lab PCs are down\nBuilding: Engineering Hall\nthanks") == "Engineering Hall"
    assert extract_building("no location given") == "Not specified"


# ---------------------------------------------------------------------------------------------
# End-to-end with the database
# ---------------------------------------------------------------------------------------------

async def test_complaint_mail_becomes_ticket_ack_then_assignment_mail(mailbox, monkeypatch):
    monkeypatch.setattr(triage_module, "classify_complaint", lambda t: (_ for _ in ()).throw(AssertionError("ML must not run")))
    mail = mailbox.deliver(101, images=[("ap.png", PNG_BYTES)])

    created = await listener_after(mailbox, 100).poll_once()
    assert len(created) == 1
    row = ticket_row(created[0])

    # ticket from the mail body, raised by the sender's (new) account
    assert row["t"].description.startswith("The Wi-Fi in the Science Block lab")
    assert row["complainant_email"] == mail.from_address and row["t"].building == "Science Block"
    assert row["attachments"] == 1
    # the LLM chose the category (lower-case answer mapped onto the known label), ML never ran
    assert (row["t"].category, row["model_version"].startswith("llm:")) == ("Network", True)
    # assigned by skills to a Network technician
    assert row["t"].status == "ASSIGNED" and row["assignee"] in ("Marcus Chen", "Priya Nair")

    # two mails to the sender, threaded under the complaint: acknowledgement first, then the assignment
    # (the worker also delivers any other pending rows, so look only at this sender's mail)
    mine = [m for m in mailbox.sent if m["to"] == mail.from_address]
    assert len(mine) == 2
    assert "We will rectify it" in mine[0]["body"] and f"#{created[0]}" in mine[0]["body"]
    assert f"assigned to {row['assignee']}" in mine[1]["body"]
    assert all(m["in_reply_to"] == mail.message_id and m["subject"] == "Re: complaint" for m in mine)
    assert row["outbox"].count(("EMAIL_ACK", "delivered")) == 1 and ("EMAIL_ASSIGNED", "delivered") in row["outbox"]
    assert {"EMAIL_RECEIVED", "EMAIL_ACK_SENT", "EMAIL_ASSIGNED_SENT"} <= set(row["events"])


async def test_same_mail_twice_creates_one_ticket(mailbox):
    first = mailbox.deliver(201)
    listener = listener_after(mailbox, 200)
    assert len(await listener.poll_once()) == 1
    mailbox.deliver(202, message_id=first.message_id, sender=first.from_address)  # re-delivered copy
    assert await listener.poll_once() == []
    assert len([m for m in mailbox.sent if "rectify" in m["body"]]) == 1


async def test_non_complaints_and_auto_replies_get_no_ticket_and_no_reply(mailbox):
    mailbox.deliver(301, subject="lunch?")
    mailbox.deliver(302, subject="complaint", auto=True)
    assert await listener_after(mailbox, 300).poll_once() == []
    assert mailbox.sent == []


async def test_restart_resumes_after_the_last_processed_mail(mailbox):
    from app.services import email_notifications

    uid = (email_notifications.last_processed_uid() or 0) + 1000
    mailbox.deliver(uid)
    assert len(await listener_after(mailbox, uid - 1).poll_once()) == 1
    mailbox.latest = uid + 5000  # a restarted listener must not jump to "newest" (would skip mail)...
    mailbox.deliver(uid + 1)
    restarted = EmailListener(mailbox)
    assert await restarted._start_uid() == uid  # ...it resumes right after the last mail that became a ticket
    assert len(await restarted.poll_once()) == 1


async def test_llm_free_choice_category_no_skill_match_stays_queued_with_ack_only(mailbox):
    CATEGORY_SCRIPT["answer"] = {"category": "Plumbing", "subcategory": "Leak", "confidence": "medium", "reason": "water"}
    mailbox.deliver(501, body="Water is leaking from the ceiling onto the server rack.")
    created = await listener_after(mailbox, 500).poll_once()
    row = ticket_row(created[0])
    assert row["t"].category == "Plumbing" and row["t"].assigned_to_user_id is None
    assert len(mailbox.sent) == 1 and "rectify" in mailbox.sent[0]["body"]


async def test_llm_failure_falls_back_to_ml_category(mailbox):
    CATEGORY_SCRIPT["raises"] = True
    mailbox.deliver(601, body="My monitor flickers and turns off every few minutes.")
    created = await listener_after(mailbox, 600).poll_once()
    row = ticket_row(created[0])
    assert row["t"].category == "Hardware" and "llm-fallback" in row["model_version"]


async def test_queued_email_ticket_gets_assignment_mail_when_dispatched(mailbox, monkeypatch):
    monkeypatch.setattr(settings, "TECH_MAX_ACTIVE_TASKS", 0)  # everyone busy
    mailbox.deliver(701)
    listener = listener_after(mailbox, 700)
    created = await listener.poll_once()
    assert ticket_row(created[0])["t"].status == "QUEUED" and len(mailbox.sent) == 1

    monkeypatch.setattr(settings, "TECH_MAX_ACTIVE_TASKS", 1000)  # a technician frees up
    assert created[0] in await assignment_service.dispatch_waiting()
    await listener.deliver_pending()
    assert len(mailbox.sent) == 2 and "assigned to" in mailbox.sent[1]["body"]


async def test_smtp_failures_are_retried_then_marked_failed(mailbox, monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MAX_SEND_ATTEMPTS", 2)
    mailbox.fail_sends = True
    mailbox.deliver(801)
    listener = listener_after(mailbox, 800)
    created = await listener.poll_once()  # ticket is still created and triaged
    row = ticket_row(created[0])
    assert row["t"].category == "Network"
    assert ("EMAIL_ACK", "failed") in row["outbox"]  # attempts used up (ack is tried before and after triage)
    mailbox.fail_sends = False
    await listener.deliver_pending()
    assert all("rectify" not in m["body"] for m in mailbox.sent)  # failed rows are not resent automatically
