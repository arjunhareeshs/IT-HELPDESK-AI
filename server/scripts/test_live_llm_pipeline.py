"""
Full pipeline run with the REAL Groq LLM.

Each complaint is stored in the database first (ticket #1's text is read from the DB; the others are
filed as new tickets), then triaged exactly as production does:
  DB text -> ML (text only) -> JSON to LLM -> LLM tool calls (queue rows, policy, ...) -> structured
  assessment -> priority score + queued_at -> queue position -> skill-based technician -> outbox notification.

It prints what the LLM itself did versus what the backend had to force, and removes the tickets it created.

    python scripts/test_live_llm_pipeline.py            # run and clean up
    python scripts/test_live_llm_pipeline.py --keep     # leave the tickets in the DB
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.config import settings  # noqa: E402
from app.db.session import get_db_session  # noqa: E402
from app.models import (  # noqa: E402
    AIToolCallAudit, NotificationOutbox, Ticket, TicketAIAssessment, TicketAssignment, TicketAttachment,
    TicketCaseMemory, TicketComment, TicketHistory, TicketIncidentLink, TicketResolutionAttempt, TicketSolution,
)
from app.repositories.tickets import tickets_repo  # noqa: E402
from app.schemas.ticket import TicketCreate  # noqa: E402
from app.services.triage_service import TriageService  # noqa: E402

NEW_COMPLAINTS = [
    ("Science Block", "The Wi-Fi access point on the 3rd floor keeps dropping, about 40 students in the lab lose their sessions every few minutes."),
    ("Examination Complex", "Oracle database listener is refusing connections and the exam results portal cannot load marks for any student."),
    ("Library West", "My monitor flickers and goes black every few minutes. I can still work on a second screen."),
]

CHILDREN = (AIToolCallAudit, TicketHistory, TicketAIAssessment, TicketAttachment, TicketAssignment,
            TicketResolutionAttempt, TicketCaseMemory, NotificationOutbox, TicketComment, TicketIncidentLink, TicketSolution)


async def check_key() -> None:
    if not (settings.GROQ_API_KEY or "").strip():
        sys.exit("GROQ_API_KEY is empty. Put it in server/.env (and save the file), then re-run.")
    from app.ai.model_factory import make_triage_model

    reply = await make_triage_model().ainvoke("Reply with the single word: ready")
    print(f"Groq reachable, model {settings.GROQ_MODEL}: {str(reply.content).strip()[:40]!r}\n")


async def main(keep: bool) -> None:
    await check_key()
    created: list[str] = []

    with get_db_session() as session:
        first = session.get(Ticket, 1)
        db_text = (first.description, first.building or "Campus") if first else None

    texts = ([("Campus", db_text[0])] if db_text else []) + NEW_COMPLAINTS
    for i, (building, text) in enumerate(texts):
        source = "llm" if i == len(texts) - 1 else "ml"  # last one: category chosen by the LLM (email path)
        t = await tickets_repo.create_ticket(TicketCreate(
            complaint_text=text, building=building, complainant_name="Live LLM Test", complainant_id="live-llm-test"))
        created.append(t.ticket_id)

        stored = await tickets_repo.get_ticket(t.ticket_id)  # the pipeline reads the text back from the DB
        report = await TriageService().triage_ticket(t.ticket_id, category_source=source)

        print("=" * 78)
        print(f"Ticket {t.ticket_id}  [{building}]  stored at {stored.created_at.isoformat()}")
        print(f'Text (from DB): "{stored.complaint_text[:100]}"')
        print(f"Category      : {report.ml_model_output}   (decided by {'LLM' if source == 'llm' else 'ML model'})")
        print(f"Assessment    : {report.assessment.severity} / {report.assessment.urgency} / {report.assessment.impact_scope}"
              f"   ({report.assessment.confidence_level} confidence)")
        print(f"LLM reasoning : {report.assessment.explanation[:160]}")
        print(f"Priority      : {report.final_priority}  score {report.priority_score}  queue position {report.queue_position}")
        print(f"Technician    : {report.assigned_technician_name or 'none (stays queued)'}")
        for call in report.tool_audit_trace:
            who = "backend-forced" if call.get("forced") else "LLM"
            print(f"  tool {call['tool']:<28} {call['status']:<9} by {who}")
        with get_db_session() as session:
            row = session.get(Ticket, int(t.ticket_id))
            note = session.execute(select(NotificationOutbox).where(NotificationOutbox.ticket_id == row.ticket_id)).scalars().first()
            print(f"DB            : status={row.status} score={row.priority_score} queued_at={row.queued_at}")
            print(f"Notification  : {note.notification_type + ' -> user ' + str(note.recipient_user_id) if note else 'none'}")

    if keep:
        print(f"\nKept tickets: {created}")
        return
    ids = [int(i) for i in created]
    with get_db_session() as session:
        for model in CHILDREN:
            session.execute(delete(model).where(model.ticket_id.in_(ids)))
        session.execute(delete(Ticket).where(Ticket.ticket_id.in_(ids)))
        session.commit()
    print(f"\nRemoved the {len(ids)} tickets this run created.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true")
    asyncio.run(main(ap.parse_args().keep))
