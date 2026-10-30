"""
End-to-end checks of the ticket pipeline against the real database and the real ML model, with a
scripted fake LLM that records exactly what it is sent.

Flow under test:
  complainant -> DB -> ML (text only) -> "Category - Subcategory" -> JSON {ML output, instructions,
  complaint text, timestamp, image analysis} -> LLM reads queue rows via tools -> priority score +
  queued_at -> ingest into queue -> notify technician. And: one ticket's content never reaches another.
"""

import asyncio
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from sqlalchemy import delete, select

from app.ai import vision
from app.ai.classification import predictor
from app.db.session import get_db_session
from app.models.assignment import TicketAssignment
from app.models.attachment import TicketAttachment
from app.models.ai_assessment import TicketAIAssessment
from app.models.audit import AIToolCallAudit
from app.models.case_memory import TicketCaseMemory
from app.models.comment import TicketComment
from app.models.incident import TicketIncidentLink
from app.models.resolution_attempt import TicketResolutionAttempt
from app.models.history import TicketHistory
from app.models.notification import NotificationOutbox
from app.models.ticket import Ticket
from app.repositories.tickets import tickets_repo
from app.schemas.ticket import TicketCreate
from app.schemas.triage import EvidenceItem, TriageAssessment
from app.services import triage_service as triage_module
from app.services.queue_service import queue_service
from app.services.triage_service import TriageService

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


class ScriptedModel(BaseChatModel):
    """Fake LLM: records every prompt, optionally calls the queue/policy tools, returns a fixed assessment."""

    call_tools: bool = True
    seen: list = []  # one list of message-content strings per model call
    structured_seen: list = []

    @property
    def _llm_type(self) -> str:
        return "scripted-test-model"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages: list[BaseMessage], stop=None, run_manager=None, **kwargs) -> ChatResult:
        self.seen.append([str(m.content) for m in messages])
        first_human = next(m for m in messages if m.type == "human")
        category = json.loads(str(first_human.content)).get("category", "Network")
        already_called = any(m.type == "tool" for m in messages)
        if self.call_tools and not already_called:
            msg = AIMessage(
                content="",
                tool_calls=[
                    {"name": "read_active_queue_rows", "args": {"limit": 10}, "id": "call-q", "type": "tool_call"},
                    {"name": "get_category_policy", "args": {"category": category}, "id": "call-p", "type": "tool_call"},
                ],
            )
        else:
            msg = AIMessage(content="evidence gathered")
        return ChatResult(generations=[ChatGeneration(message=msg)])

    def with_structured_output(self, schema, **kwargs):
        model = self

        class _Structured:
            async def ainvoke(self, messages, *a, **k):
                text = "\n".join(str(m.content) for m in messages)
                model.structured_seen.append(text)
                ticket = json.loads(re.search(r"TICKET_JSON:\n(.*?)\nCLASSIFIER_JSON:", text, re.S).group(1))
                clf = json.loads(re.search(r"CLASSIFIER_JSON:\n(.*?)\nEVIDENCE_PACK_JSON:", text, re.S).group(1))
                return TriageAssessment(
                    ticket_id=ticket["ticket_id"],
                    category_from_classifier=clf["predicted_category"],
                    severity="high",
                    urgency="urgent",
                    impact_scope="multiple_users",
                    service_impact="Service degraded for several users.",
                    evidence=[EvidenceItem(source_type="complaint", source_id=ticket["ticket_id"],
                                           observation="Reported by user", supports="severity")],
                    similar_ticket_ids=[],
                    suggested_next_step="Dispatch technician.",
                    missing_information=[],
                    requires_human_review=False,
                    confidence_level="high",
                    explanation="Scripted assessment.",
                )

        return _Structured()


class FakeVision(BaseChatModel):
    @property
    def _llm_type(self) -> str:
        return "fake-vision"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Router with a red error light."))])


@pytest.fixture
def created():
    """Track tickets/files created by a test and remove them afterwards."""
    ids: list[str] = []
    files: list[Path] = []
    yield ids, files
    int_ids = [int(i) for i in ids if str(i).isdigit()]
    if int_ids:
        with get_db_session() as session:
            # Not every FK in the live schema cascades, so remove children explicitly (only rows this test made).
            for model in (AIToolCallAudit, TicketHistory, TicketAIAssessment, TicketAttachment, TicketAssignment,
                          TicketResolutionAttempt, TicketCaseMemory, NotificationOutbox, TicketComment,
                          TicketIncidentLink):
                session.execute(delete(model).where(model.ticket_id.in_(int_ids)))
            session.execute(delete(Ticket).where(Ticket.ticket_id.in_(int_ids)))
            session.commit()
    for f in files:
        f.unlink(missing_ok=True)


def install_models(monkeypatch, *, call_tools=True) -> list[ScriptedModel]:
    """Each triage run gets its own fresh model instance (no shared conversation state)."""
    models: list[ScriptedModel] = []

    def factory(*a, **k):
        m = ScriptedModel(call_tools=call_tools, seen=[], structured_seen=[])
        models.append(m)
        return m

    monkeypatch.setattr(triage_module, "make_triage_model", factory)
    monkeypatch.setattr(vision, "make_vision_model", lambda: FakeVision())
    return models


async def new_ticket(ids, text, building="Science Block", college="main-campus"):
    t = await tickets_repo.create_ticket(TicketCreate(
        complaint_text=text, building=building, complainant_name="Pipeline Tester",
        complainant_id="pipeline-tester", college_id=college,
    ))
    ids.append(t.ticket_id)
    return t


# --------------------------------------------------------------------------------------
# 1. DB first, then ML on the text field alone, output "Category - Subcategory"
# --------------------------------------------------------------------------------------

async def test_ticket_is_in_db_before_ml_and_ml_gets_only_the_text(monkeypatch, created):
    ids, _ = created
    install_models(monkeypatch)
    text = "The Wi-Fi access point in the library keeps dropping connections."
    ticket = await new_ticket(ids, text, building="Library West")

    with get_db_session() as session:  # persisted before any model ran
        row = session.execute(select(Ticket).where(Ticket.ticket_id == int(ticket.ticket_id))).scalar_one()
        assert row.status == "AI_PENDING" and row.description == text

    classifier_inputs: list[str] = []
    real = predictor.classify_complaint

    def spy(arg):
        classifier_inputs.append(arg)
        return real(arg)

    monkeypatch.setattr(triage_module, "classify_complaint", spy)
    report = await TriageService().triage_ticket(ticket.ticket_id)

    assert classifier_inputs == [text]  # the complaint text and nothing else (no building, id, timestamp)
    assert re.fullmatch(r"[\w/ ]+ - [\w /.]+", report.ml_model_output), report.ml_model_output
    assert report.ml_model_output.startswith(report.assessment.category_from_classifier)


# --------------------------------------------------------------------------------------
# 2. The LLM receives one JSON document with everything it needs
# --------------------------------------------------------------------------------------

async def test_llm_receives_json_with_ml_output_instructions_text_timestamp_and_image(monkeypatch, created):
    ids, files = created
    models = install_models(monkeypatch)
    ticket = await new_ticket(ids, "Switch in the lab shows a red light and nothing connects.")

    key = f"{ticket.ticket_id}/test-{uuid.uuid4().hex}.png"
    path = vision._upload_root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(PNG_BYTES)
    files.append(path)
    with get_db_session() as session:
        session.add(TicketAttachment(ticket_id=int(ticket.ticket_id), attachment_type="complaint", storage_key=key,
                                     file_name="red-light.png", mime_type="image/png", file_size_bytes=len(PNG_BYTES)))
        session.commit()

    report = await TriageService().triage_ticket(ticket.ticket_id)
    stored = await tickets_repo.get_ticket(ticket.ticket_id)

    first_prompt = models[0].seen[0]  # [system, human]
    payload = json.loads(first_prompt[1])
    assert payload["ticket_id"] == ticket.ticket_id
    assert payload["complaint_text"] == ticket.complaint_text
    assert payload["ml_model_output"] == report.ml_model_output
    assert payload["category"] and payload["subcategory"]
    assert payload["timestamp"] == stored.created_at.isoformat()
    assert "prefetched_context" in payload["system_instructions"] and "queue_rows" in payload["prefetched_context"]
    assert payload["attached_images"][0]["file_name"] == "red-light.png"
    assert payload["image_analysis"] == "Router with a red error light."

    # the structured-assessment call gets the same ticket JSON (timestamp + image evidence included)
    structured = models[0].structured_seen[-1]  # last call = the final assessment (earlier ones may be classification)
    assert payload["timestamp"] in structured and "Router with a red error light." in structured


async def test_no_image_means_no_image_fields_populated(monkeypatch, created):
    ids, _ = created
    models = install_models(monkeypatch)
    ticket = await new_ticket(ids, "Keyboard keys are stuck on the front desk PC.")
    await TriageService().triage_ticket(ticket.ticket_id)
    payload = json.loads(models[0].seen[0][1])
    assert payload["attached_images"] == [] and payload["image_analysis"] is None


# --------------------------------------------------------------------------------------
# 3. Tools read queue rows; score + queued_at stored; ingested; technician notified
# --------------------------------------------------------------------------------------

async def test_queue_read_score_ingest_and_notify(monkeypatch, created):
    ids, _ = created
    install_models(monkeypatch)
    ticket = await new_ticket(ids, "DHCP is not handing out addresses on the second floor switch.")
    report = await TriageService().triage_ticket(ticket.ticket_id)

    tools = {t["tool"]: t for t in report.tool_audit_trace}
    assert tools["read_active_queue_rows"]["status"] == "success" and not tools["read_active_queue_rows"]["forced"]
    assert tools["get_category_policy"]["status"] == "success"

    with get_db_session() as session:
        row = session.execute(select(Ticket).where(Ticket.ticket_id == int(ticket.ticket_id))).scalar_one()
        assert row.priority_score is not None and row.queued_at is not None
        assert row.status in ("ASSIGNED", "QUEUED", "NEEDS_HUMAN_REVIEW")
        assert float(row.priority_score) == report.priority_score
        notes = session.execute(select(NotificationOutbox).where(NotificationOutbox.ticket_id == row.ticket_id)).scalars().all()
        audit = session.execute(select(AIToolCallAudit).where(AIToolCallAudit.ticket_id == row.ticket_id)).scalars().all()
        assert {a.tool_name for a in audit} >= {"read_active_queue_rows", "get_category_policy"}
        if row.status == "ASSIGNED":
            assert len(notes) == 1 and notes[0].notification_type == "NEW_ASSIGNMENT"
            assert notes[0].recipient_user_id == row.assigned_to_user_id
    assert report.queue_position and report.queue_position >= 1


async def test_backend_forces_queue_read_when_the_model_skips_tools(monkeypatch, created):
    ids, _ = created
    install_models(monkeypatch, call_tools=False)  # e.g. no API key / model that never calls tools
    ticket = await new_ticket(ids, "Projector in Room 12 will not turn on.")
    report = await TriageService().triage_ticket(ticket.ticket_id)
    forced = {t["tool"] for t in report.tool_audit_trace if t.get("forced")}
    assert {"read_active_queue_rows", "get_category_policy"} <= forced


async def test_retriage_does_not_duplicate_assignment_notification_or_reset_queue_time(monkeypatch, created):
    ids, _ = created
    install_models(monkeypatch)
    ticket = await new_ticket(ids, "Wireless keeps dropping in the examination hall.")
    svc = TriageService()
    await svc.triage_ticket(ticket.ticket_id)
    with get_db_session() as session:
        first_queued = session.get(Ticket, int(ticket.ticket_id)).queued_at
    await svc.triage_ticket(ticket.ticket_id, is_retriage=True, retriage_reason="more evidence")
    with get_db_session() as session:
        row = session.get(Ticket, int(ticket.ticket_id))
        assigns = session.execute(select(TicketAssignment).where(TicketAssignment.ticket_id == row.ticket_id)).scalars().all()
        notes = session.execute(select(NotificationOutbox).where(NotificationOutbox.ticket_id == row.ticket_id)).scalars().all()
        assert row.queued_at == first_queued
        if row.assigned_to_user_id:
            assert len(assigns) == 1 and len(notes) == 1


async def test_failed_triage_is_marked_not_left_pending(monkeypatch, created):
    ids, _ = created
    install_models(monkeypatch)
    monkeypatch.setattr(triage_module, "classify_complaint", lambda t: (_ for _ in ()).throw(RuntimeError("model down")))
    ticket = await new_ticket(ids, "Printer on level 3 jams on every page.")
    assert await TriageService().triage_ticket_safe(ticket.ticket_id) is None
    with get_db_session() as session:
        assert session.get(Ticket, int(ticket.ticket_id)).status == "NEEDS_HUMAN_REVIEW"
        events = session.execute(select(TicketHistory.event_type).where(TicketHistory.ticket_id == int(ticket.ticket_id))).scalars().all()
        assert "TRIAGE_FAILED" in events


# --------------------------------------------------------------------------------------
# 4. Ticket isolation: one ticket's content must never be perceived while processing another
# --------------------------------------------------------------------------------------

async def test_ticket_content_never_leaks_into_another_tickets_llm_context(monkeypatch, created):
    ids, _ = created
    models = install_models(monkeypatch)
    a = await new_ticket(ids, "ZEBRA-ALPHA-7731 the Oracle database listener refuses connections.", building="Alpha Hall")
    b = await new_ticket(ids, "QUOKKA-BETA-9912 the lecture hall projector shows no signal.", building="Beta Hall")

    svc = TriageService()
    await svc.triage_ticket(a.ticket_id)
    await svc.triage_ticket(b.ticket_id)

    model_a, model_b = models
    everything_b = "\n".join(s for call in model_b.seen for s in call) + "\n".join(model_b.structured_seen)
    everything_a = "\n".join(s for call in model_a.seen for s in call) + "\n".join(model_a.structured_seen)
    assert "QUOKKA-BETA-9912" in everything_b and "ZEBRA-ALPHA-7731" not in everything_b
    assert "ZEBRA-ALPHA-7731" in everything_a and "QUOKKA-BETA-9912" not in everything_a
    assert "Alpha Hall" not in everything_b  # the other ticket's location does not leak either

    # fresh model per ticket, and no accumulated chat history: the 2nd run starts from [system, human]
    assert len(models) == 2 and len(model_b.seen[0]) == 2
    # case memory is per ticket
    mem_a = await tickets_repo.get_case_memory(a.ticket_id)
    mem_b = await tickets_repo.get_case_memory(b.ticket_id)
    assert "Alpha Hall" not in json.dumps(mem_b.case_facts.model_dump())
    assert "Beta Hall" not in json.dumps(mem_a.case_facts.model_dump())


async def test_concurrent_triage_keeps_tickets_separate(monkeypatch, created):
    ids, _ = created
    models = install_models(monkeypatch)
    a = await new_ticket(ids, "MANGO-AAA-1111 the wifi in block A is down for everyone.")
    b = await new_ticket(ids, "PAPAYA-BBB-2222 my keyboard has a broken spacebar.")
    ra, rb = await asyncio.gather(TriageService().triage_ticket(a.ticket_id), TriageService().triage_ticket(b.ticket_id))

    assert ra.ticket_id == a.ticket_id and rb.ticket_id == b.ticket_id
    for m in models:
        blob = "\n".join(s for call in m.seen for s in call) + "\n".join(m.structured_seen)
        assert not ("MANGO-AAA-1111" in blob and "PAPAYA-BBB-2222" in blob)


def test_in_memory_ticket_ids_can_never_alias_a_real_database_row():
    assert tickets_repo._parse_id("TCK-2026-0001") is None
    assert tickets_repo._parse_id("1") == 1 and tickets_repo._parse_id("24") == 24
    assert tickets_repo._parse_id("") is None and tickets_repo._parse_id("1; DROP TABLE") is None


def test_queue_rows_hold_no_complaint_text_and_respect_college_and_exclusion(monkeypatch):
    now = datetime.now(timezone.utc)

    def row(tid, score, mins, college="main-campus", status="ASSIGNED"):
        return {"ticket_id": tid, "priority": "P2", "priority_score": score, "status": status, "college_id": college,
                "queued_at": now - timedelta(minutes=mins), "created_at": now - timedelta(minutes=mins),
                "predicted_category": "Network", "building": "X", "assigned_technician_id": "1",
                "complaint_text": "SECRET-COMPLAINT"}

    rows = [row("1", 70, 5), row("2", 90, 1), row("3", 70, 30), row("4", 99, 1, college="other-college"),
            {**row("5", None, 1), "priority": None},  # never triaged: not in the queue
            row("6", 80, 1, status="RESOLVED"), row("7", 60, 1, status="AI_PENDING"),
            row("8", None, 2)]  # triaged before the queue columns existed: scored from its P2 priority
    monkeypatch.setattr("app.services.queue_service.tickets_repo.get_active_tickets", lambda: rows)

    got = queue_service.get_active_queue_rows(limit=10, college_id="main-campus", exclude_ticket_id="2")
    assert [r["ticket_id"] for r in got] == ["3", "1", "8"]  # score desc; ties by oldest queued_at; "8" is scored 70 from its P2
    assert "SECRET-COMPLAINT" not in json.dumps(got)
    pos = queue_service.calculate_queue_position("1", "P2", 4, college_id="main-campus")
    assert pos.queue_position == 3  # behind ticket 2 (score 90) and ticket 3 (same score, queued earlier)
