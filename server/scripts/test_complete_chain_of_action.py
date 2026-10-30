import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo
from app.services.triage_service import TriageService
from app.db.session import get_db_session
from app.models.ticket import Ticket
from app.models.ai_assessment import TicketAIAssessment
from app.models.assignment import TicketAssignment
from app.models.notification import NotificationOutbox
from app.models.history import TicketHistory


async def test_full_chain_of_action():
    print("=" * 70)
    print("TESTING COMPLETE TICKET PIPELINE & LANGCHAIN CHAIN OF ACTION")
    print("=" * 70)

    # -------------------------------------------------------------
    # Step 1: Complainant submits new ticket -> DB Insertion
    # -------------------------------------------------------------
    print("[Step 1] Complainant creates a new ticket...", flush=True)
    complaint_data = TicketCreate(
        complaint_text="Wi-Fi access point in Science Block 3rd floor is repeatedly flapping.",
        building="Science Block",
        complainant_name="Prof. Sarah Jenkins",
        complainant_id="prof-jenkins-42",
        affected_service="Campus Wi-Fi",
    )
    new_ticket = await tickets_repo.create_ticket(complaint_data)
    ticket_id = new_ticket.ticket_id
    print(f"  -> Ticket created in DB with ID: {ticket_id}", flush=True)
    print(f"  -> Initial Status: {new_ticket.status}", flush=True)
    print(f"  -> Created Timestamp: {new_ticket.created_at}", flush=True)
    assert new_ticket.status == "AI_PENDING"

    # -------------------------------------------------------------
    # Step 2 & 3 & 4 & 5: Run Full AI Triage Pipeline
    # -------------------------------------------------------------
    print("\n[Step 2-5] Executing AI Triage Pipeline & LangChain Tools...", flush=True)
    triage_service = TriageService()
    report = await triage_service.triage_ticket(ticket_id)

    print(f"  -> ML Category Output: {report.assessment.category_from_classifier}", flush=True)
    print(f"  -> Assessed Severity: {report.assessment.severity}", flush=True)
    print(f"  -> Calculated Priority: {report.final_priority}", flush=True)
    print(f"  -> Assigned Technician: {report.assigned_technician_name} (ID: {report.assigned_technician_id})", flush=True)

    # -------------------------------------------------------------
    # Step 6: Verify Database Ingestion & Outbox Notification
    # -------------------------------------------------------------
    print("\n[Step 6] Verifying Live PostgreSQL State via SQLAlchemy...")
    int_id = int(ticket_id)
    with get_db_session() as session:
        # Check Ticket
        t = session.query(Ticket).filter(Ticket.ticket_id == int_id).first()
        assert t is not None, "Ticket row missing from DB!"
        print(f"  [OK] Ticket in DB:")
        print(f"       Status: {t.status}")
        print(f"       Category: {t.category}")
        print(f"       Priority: {t.priority}")
        print(f"       Priority Score: {t.priority_score}")
        print(f"       Queued At: {t.queued_at}")
        assert t.queued_at is not None, "queued_at timestamp must be populated!"
        assert t.priority_score is not None, "priority_score must be populated!"

        # Check AI Assessment
        assessment = session.query(TicketAIAssessment).filter(TicketAIAssessment.ticket_id == int_id).first()
        assert assessment is not None, "TicketAIAssessment missing from DB!"
        print(f"  [OK] AI Assessment in DB:")
        print(f"       Classifier Category: {assessment.classifier_category}")
        print(f"       Subcategory: {assessment.subcategory}")
        print(f"       Severity: {assessment.severity}")
        print(f"       Priority Proposed: {assessment.priority_proposed}")

        # Check Technician Assignment
        assignment = session.query(TicketAssignment).filter(TicketAssignment.ticket_id == int_id).first()
        if assignment:
            print(f"  [OK] Technician Assignment in DB: Tech ID={assignment.technician_user_id}, Status={assignment.assignment_status}")

        # Check Notification Outbox
        notif = session.query(NotificationOutbox).filter(NotificationOutbox.ticket_id == int_id).first()
        assert notif is not None, "NotificationOutbox missing for technician!"
        print(f"  [OK] Notification Outbox in DB:")
        print(f"       Recipient Tech ID: {notif.recipient_user_id}")
        print(f"       Notification Type: {notif.notification_type}")
        print(f"       Delivery Status: {notif.delivery_status}")
        print(f"       Payload: {json.dumps(notif.payload)}")

        # Check Ticket History
        history_count = session.query(TicketHistory).filter(TicketHistory.ticket_id == int_id).count()
        print(f"  [OK] History Audit Events in DB: {history_count}")
        assert history_count >= 2, "Expected at least creation + auto_triaged history events!"

    print("\n" + "=" * 70)
    print("PIPELINE & CHAIN OF ACTION FULLY VERIFIED IN POSTGRESQL!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_full_chain_of_action())
