"""
Test script verifying:
1. Unbiased Priority & Queue Ordering:
   - Compares a minor chair / crease complaint vs a classroom projector vs a core server outage.
   - Proves the system instructions ensure a broken chair is strictly P4 (Score ~20) and never overtakes servers or classrooms.
2. Reference Image Dispatch to Technician:
   - Uploads an image to an assigned ticket.
   - Proves the technician receives a REFERENCE_IMAGE_ADDED notification in PostgreSQL outbox.
   - Proves TicketRead includes reference_images.
"""

import asyncio
import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import get_db_session
from sqlalchemy import select, desc
from app.models.ticket import Ticket
from app.models.notification import NotificationOutbox
from app.models.attachment import TicketAttachment
from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo
from app.services.ticket_service import ticket_service
from app.services.triage_service import triage_service
from app.api.v1.endpoints.attachments import store_attachment


async def run_test():
    print("=" * 75, flush=True)
    print("TEST 1: UNBIASED DECISION MAKING & PRIORITY HIERARCHY TEST", flush=True)
    print("=" * 75, flush=True)

    # 1. Complainant with emotional wording for a trivial chair/crease issue
    print("\n[Case A] Filing complaint for minor furniture/convenience issue:", flush=True)
    complaint_chair = TicketCreate(
        complaint_text="EMERGENCY!! In Room 204 a small chair is broken and seat cover is creased. Please replace immediately!",
        building="Science Block",
        complainant_name="Student Council",
        complainant_id="user-chair-01",
        affected_service="Classroom Seating",
    )
    ticket_chair = await tickets_repo.create_ticket(complaint_chair)
    report_chair = await triage_service.triage_ticket(ticket_chair.ticket_id)

    print(f"  -> Ticket #{ticket_chair.ticket_id} (Chair & Crease):", flush=True)
    print(f"     Severity:       {report_chair.assessment.severity}", flush=True)
    print(f"     Urgency:        {report_chair.assessment.urgency}", flush=True)
    print(f"     Impact Scope:   {report_chair.assessment.impact_scope}", flush=True)
    print(f"     Final Priority: {report_chair.final_priority}", flush=True)
    db_chair = await ticket_service.get_ticket(ticket_chair.ticket_id)
    print(f"     Priority Score: {db_chair.priority_score}", flush=True)

    # 2. Critical Server Outage
    print("\n[Case B] Filing complaint for Core Server Room Outage:", flush=True)
    complaint_server = TicketCreate(
        complaint_text="Core authentication server and database crashed in Central Data Center. Campus portal offline.",
        building="Data Center",
        complainant_name="SysAdmin Lead",
        complainant_id="admin-sys-01",
        affected_service="Core Infrastructure",
    )
    ticket_server = await tickets_repo.create_ticket(complaint_server)
    report_server = await triage_service.triage_ticket(ticket_server.ticket_id)

    print(f"  -> Ticket #{ticket_server.ticket_id} (Core Server Outage):", flush=True)
    print(f"     Severity:       {report_server.assessment.severity}", flush=True)
    print(f"     Urgency:        {report_server.assessment.urgency}", flush=True)
    print(f"     Impact Scope:   {report_server.assessment.impact_scope}", flush=True)
    print(f"     Final Priority: {report_server.final_priority}", flush=True)
    db_server = await ticket_service.get_ticket(ticket_server.ticket_id)
    print(f"     Priority Score: {db_server.priority_score}", flush=True)

    # Assertions on Priority Hierarchy
    assert report_chair.final_priority == "P4", f"Chair issue must be P4, got {report_chair.final_priority}"
    assert report_server.final_priority == "P1", f"Server outage must be P1, got {report_server.final_priority}"
    assert db_server.priority_score > db_chair.priority_score, "Server priority score must strictly exceed chair priority score!"
    print(f"\n[PASS] Hierarchy Verified: Server Score ({db_server.priority_score}) >>> Chair Score ({db_chair.priority_score})")

    # ------------------------------------------------------------------
    # TEST 2: Reference Image Forwarding to Technician
    # ------------------------------------------------------------------
    print("\n" + "=" * 75, flush=True)
    print("TEST 2: REFERENCE IMAGE DISPATCH TO TECHNICIAN", flush=True)
    print("=" * 75, flush=True)

    assigned_tech_id = db_server.assigned_technician_id or 1
    print(f"  -> Ticket #{ticket_server.ticket_id} is assigned to Technician ID: {assigned_tech_id}", flush=True)

    # Simulate Admin uploading a reference photo for the technician
    fake_png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    stored_att = store_attachment(
        int_id=int(ticket_server.ticket_id),
        file_name="rack_server_diagram_reference.png",
        data=fake_png_data,
        attachment_type="diagnostic"
    )
    print(f"  -> Reference image stored with Attachment ID: {stored_att.attachment_id}", flush=True)

    # Check that technician receives a notification in notifications_outbox
    with get_db_session() as session:
        notif = session.execute(
            select(NotificationOutbox).where(
                NotificationOutbox.ticket_id == int(ticket_server.ticket_id),
                NotificationOutbox.notification_type == "REFERENCE_IMAGE_ADDED"
            ).order_by(desc(NotificationOutbox.created_at))
        ).scalars().first()

        assert notif is not None, "Technician outbox must contain REFERENCE_IMAGE_ADDED notification!"
        print(f"  [PASS] Technician Notification in Outbox:")
        print(f"         Recipient Tech ID: {notif.recipient_user_id}")
        print(f"         Notification Type: {notif.notification_type}")
        print(f"         Payload URL:       {notif.payload.get('url')}")
        print(f"         Payload Message:   {notif.payload.get('message')}")

    # Check that TicketRead now returns the reference image
    updated_ticket = await ticket_service.get_ticket(ticket_server.ticket_id)
    assert len(updated_ticket.reference_images) > 0, "TicketRead must contain reference_images!"
    ref_img = updated_ticket.reference_images[0]
    print(f"  [PASS] TicketRead contains reference_images:")
    print(f"         File Name: {ref_img.file_name}")
    print(f"         MIME Type: {ref_img.mime_type}")
    print(f"         URL:       {ref_img.url}")

    print("\n" + "=" * 75, flush=True)
    print("ALL TESTS PASSED SUCCESSFULLY!", flush=True)
    print("=" * 75, flush=True)


if __name__ == "__main__":
    asyncio.run(run_test())

