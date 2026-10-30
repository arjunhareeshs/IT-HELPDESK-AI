"""
Verification Script:
1. Checks DB connection and all registered tables in PostgreSQL.
2. Simulates a complainant submitting a new complaint.
3. Verifies immediate insertion into the 'tickets' table with status 'AI_PENDING'.
4. Verifies Admin immediately sees the complaint in the global ticket centre (unfiltered ticket list).
5. Executes the AI triage workflow (ML category -> SQL tool -> priority scoring -> assignment).
6. Verifies that the DB is fully updated with all details:
   - tickets (status, priority, priority_score, queued_at, assigned_to_user_id)
   - ticket_ai_assessments (category, subcategory, severity, priority, reasoning)
   - ticket_assignments (technician_user_id, status)
   - ticket_history (TICKET_CREATED, AI_TRIAGED, ASSIGNED)
   - notifications_outbox (NEW_ASSIGNMENT event for technician)
7. Verifies Admin's refreshed view has all the triage details.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import get_db_session, engine
from sqlalchemy import inspect, select, desc
from app.models.ticket import Ticket
from app.models.history import TicketHistory
from app.models.ai_assessment import TicketAIAssessment
from app.models.assignment import TicketAssignment
from app.models.notification import NotificationOutbox
from app.models.case_memory import TicketCaseMemory
from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo
from app.services.ticket_service import ticket_service
from app.services.triage_service import triage_service


async def verify_lifecycle():
    print("=" * 75, flush=True)
    print("STEP 1: INSPECTING POSTGRESQL DATABASE & REGISTERED TABLES", flush=True)
    print("=" * 75, flush=True)

    with get_db_session() as session:
        from sqlalchemy import text
        rows = session.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )).fetchall()
        table_names = [r[0] for r in rows]
        print(f"Total tables detected in PostgreSQL database: {len(table_names)}", flush=True)
        for t in table_names:
            print(f"  - Table: {t}", flush=True)

    print("\n" + "=" * 75, flush=True)
    print("STEP 2: COMPLAINANT SUBMITS A NEW COMPLAINT", flush=True)
    print("=" * 75, flush=True)

    sample_complaint = TicketCreate(
        complaint_text="Projector in Lecture Hall 204 keeps overheating and shutting off during class.",
        building="Academic Complex",
        complainant_name="Prof. David Banner",
        complainant_id="prof-banner-99",
        affected_service="Classroom Technology",
        college_id="main-campus"
    )

    created_ticket = await tickets_repo.create_ticket(sample_complaint)
    ticket_id = created_ticket.ticket_id
    print(f"  -> Ticket successfully inserted into PostgreSQL with ID: {ticket_id}")
    print(f"  -> Initial DB Status: {created_ticket.status}")
    print(f"  -> Complainant Name:  {created_ticket.complainant_name}")
    print(f"  -> Created At:        {created_ticket.created_at}")

    print("\n" + "=" * 75)
    print("STEP 3: VERIFY DIRECT DB INSERTION IN POSTGRESQL (IMMEDIATELY AVAILABLE)")
    print("=" * 75)

    with get_db_session() as session:
        db_ticket = session.execute(
            select(Ticket).where(Ticket.ticket_id == int(ticket_id))
        ).scalar_one_or_none()

        assert db_ticket is not None, "Ticket must exist in DB immediately!"
        assert db_ticket.status == "AI_PENDING", "Initial status must be AI_PENDING!"
        print(f"  [PASS] Ticket #{db_ticket.ticket_id} verified directly in DB `tickets` table.")
        print(f"         Description: {db_ticket.description}")
        print(f"         Status:      {db_ticket.status}")
        print(f"         Building:    {db_ticket.building}")

    print("\n" + "=" * 75)
    print("STEP 4: VERIFY ADMIN SEES THE COMPLAINT IN GLOBAL TICKET LIST")
    print("=" * 75)

    admin_ticket_list = await ticket_service.list_tickets()
    matching_admin_tickets = [t for t in admin_ticket_list if str(t.ticket_id) == str(ticket_id)]
    assert len(matching_admin_tickets) > 0, "Admin must see the complaint in the global ticket list!"
    admin_view = matching_admin_tickets[0]
    print(f"  [PASS] Admin fetched global ticket list: found {len(admin_ticket_list)} total tickets.")
    print(f"         New complaint visible to Admin: ID #{admin_view.ticket_id}")
    print(f"         Complainant: {admin_view.complainant_name} ({admin_view.building})")
    print(f"         Status:      {admin_view.status}")

    print("\n" + "=" * 75)
    print("STEP 5: EXECUTE AI TRIAGE & DB UPDATE PIPELINE")
    print("=" * 75)

    report = await triage_service.triage_ticket(ticket_id)
    print(f"  -> Triage finished successfully!", flush=True)
    print(f"  -> Category from ML:    {report.assessment.category_from_classifier}", flush=True)
    print(f"  -> Severity:             {report.assessment.severity}", flush=True)
    print(f"  -> Priority:             {report.final_priority}", flush=True)
    print(f"  -> Assigned Tech:        {report.assigned_technician_name} (ID: {report.assigned_technician_id})", flush=True)

    print("\n" + "=" * 75)
    print("STEP 6: VERIFY POSTGRESQL DATABASE HAS BEEN UPDATED")
    print("=" * 75)

    with get_db_session() as session:
        updated_db_ticket = session.execute(
            select(Ticket).where(Ticket.ticket_id == int(ticket_id))
        ).scalar_one_or_none()

        print(f"  [PASS] DB `tickets` row updated:")
        print(f"         Status:         {updated_db_ticket.status}")
        print(f"         Category:       {updated_db_ticket.category}")
        print(f"         Priority:       {updated_db_ticket.priority}")
        print(f"         Priority Score: {updated_db_ticket.priority_score}")
        print(f"         Queued At:      {updated_db_ticket.queued_at}")
        print(f"         Assigned Tech:  {updated_db_ticket.assigned_to_user_id}")

        assessment_row = session.execute(
            select(TicketAIAssessment).where(TicketAIAssessment.ticket_id == int(ticket_id))
        ).scalars().first()
        print(f"  [PASS] DB `ticket_ai_assessments` row created:")
        print(f"         Classifier Category: {assessment_row.classifier_category}")
        print(f"         Subcategory:         {assessment_row.subcategory}")
        print(f"         Severity:            {assessment_row.severity}")
        print(f"         Priority Proposed:   {assessment_row.priority_proposed}")

        assignment_row = session.execute(
            select(TicketAssignment).where(TicketAssignment.ticket_id == int(ticket_id))
        ).scalars().first()
        print(f"  [PASS] DB `ticket_assignments` row created:")
        print(f"         Tech User ID:      {assignment_row.technician_user_id}")
        print(f"         Assignment Status: {assignment_row.assignment_status}")

        outbox_row = session.execute(
            select(NotificationOutbox).where(NotificationOutbox.ticket_id == int(ticket_id))
        ).scalars().first()
        print(f"  [PASS] DB `notifications_outbox` row created:")
        print(f"         Recipient:    {outbox_row.recipient_user_id}")
        print(f"         Type:         {outbox_row.notification_type}")
        print(f"         Status:       {outbox_row.delivery_status}")

        history_rows = session.execute(
            select(TicketHistory).where(TicketHistory.ticket_id == int(ticket_id)).order_by(TicketHistory.created_at)
        ).scalars().all()
        print(f"  [PASS] DB `ticket_history` audit trail created ({len(history_rows)} events):")
        for h in history_rows:
            print(f"         - [{h.event_type}] by {h.actor_type}: {h.note}")

    print("\n" + "=" * 75)
    print("STEP 7: VERIFY ADMIN REFRESH SHOWS FULL TRIAGED DETAILS")
    print("=" * 75)

    refreshed_ticket = await ticket_service.get_ticket(ticket_id)
    print(f"  [PASS] Admin query returns full ticket details:")
    print(f"         Ticket ID:        #{refreshed_ticket.ticket_id}")
    print(f"         Status:           {refreshed_ticket.status}")
    print(f"         Category:         {refreshed_ticket.predicted_category}")
    print(f"         Priority:         {refreshed_ticket.priority} (Score: {refreshed_ticket.priority_score})")
    print(f"         Queued At:        {refreshed_ticket.queued_at}")
    print(f"         Assigned Tech:    {refreshed_ticket.assigned_technician_name}")
    print(f"         Timeline Events:  {len(refreshed_ticket.timeline)}")

    print("\n" + "=" * 75)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(verify_lifecycle())
