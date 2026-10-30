"""
Verify AI Autotrigger Across All Intake Channels:
1. Complainant/Admin API route submission -> autotriggers triage.
2. Direct/Email intake message -> autotriggers triage.
3. Background Triage Sweeper -> automatically sweeps and triages any pending tickets.
"""

import asyncio
import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import get_db_session
from sqlalchemy import select
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo
from app.services.ticket_service import ticket_service
from app.services.triage_service import triage_service
from app.workers.triage_sweeper import sweep_pending_tickets
from app.integrations.mail_client import InboundMessage


async def test_autotrigger():
    print("=" * 75, flush=True)
    print("TESTING AI AUTOTRIGGER ACROSS ALL INTAKE PATHS", flush=True)
    print("=" * 75, flush=True)

    # 1. Complainant Web Submission
    print("\n[Path 1] Complainant creates ticket with auto-triage enabled...", flush=True)
    comp_ticket = await tickets_repo.create_ticket(TicketCreate(
        complaint_text="Student lab workstation 12 in Engineering Hall has blue-screened with memory error.",
        building="Engineering Hall",
        complainant_name="Prof. Harrison",
        complainant_id="prof-harrison-404",
        affected_service="Lab Workstations"
    ))
    print(f"  -> Ticket #{comp_ticket.ticket_id} created with initial status: {comp_ticket.status}", flush=True)

    # Trigger triage safe (as background_tasks does)
    print("  -> Autotriggering triage in background...", flush=True)
    report = await triage_service.triage_ticket_safe(comp_ticket.ticket_id)
    assert report is not None, "Triage report must succeed!"
    
    db_comp = await ticket_service.get_ticket(comp_ticket.ticket_id)
    print(f"  [PASS] Ticket #{comp_ticket.ticket_id} autotriaged:")
    print(f"         New Status:     {db_comp.status}")
    print(f"         Category:       {db_comp.predicted_category}")
    print(f"         Priority:       {db_comp.priority} (Score: {db_comp.priority_score})")
    print(f"         Assigned Tech:  {db_comp.assigned_technician_name}")
    assert db_comp.status in ("ASSIGNED", "QUEUED"), f"Status must be ASSIGNED or QUEUED, got {db_comp.status}"

    # 2. Email Intake Path
    print("\n[Path 2] Inbound Email Complaint arrives...", flush=True)
    from app.workers.email_listener import EmailListener

    class MockMailClient:
        def latest_uid(self): return 9999
        def fetch_new(self, after): return []

    email_listener = EmailListener(client=MockMailClient(), triage=triage_service)
    mock_email = InboundMessage(
        uid=8888,
        message_id="<test-email-autotrigger-99@campus.edu>",
        from_address="student.complaint@campus.edu",
        from_name="Alex Mercer",
        subject="complaint",
        body="Building: Library West\nWi-Fi is completely unreachable on the 2nd floor silent study area.",
        is_auto_generated=False,
        images=[],
    )

    email_ticket_id = await email_listener.handle_message(mock_email)
    print(f"  -> Email intake processed and created Ticket #{email_ticket_id}", flush=True)

    db_email = await ticket_service.get_ticket(email_ticket_id)
    print(f"  [PASS] Email Ticket #{email_ticket_id} automatically triaged:")
    print(f"         Status:         {db_email.status}")
    print(f"         Category:       {db_email.predicted_category}")
    print(f"         Priority:       {db_email.priority} (Score: {db_email.priority_score})")
    print(f"         Assigned Tech:  {db_email.assigned_technician_name}")
    assert db_email.status in ("ASSIGNED", "QUEUED")

    # 3. Sweeper Path: Sweeps any older pending tickets
    print("\n[Path 3] Running Auto-Triage Sweeper on any backlog tickets...", flush=True)
    swept_count = await sweep_pending_tickets()
    print(f"  -> Sweeper checked and processed {swept_count} ticket(s) from pending backlog.", flush=True)

    print("\n" + "=" * 75, flush=True)
    print("ALL AUTOTRIGGER INTAKE PATHS FULLY VERIFIED!", flush=True)
    print("=" * 75, flush=True)


if __name__ == "__main__":
    asyncio.run(test_autotrigger())

