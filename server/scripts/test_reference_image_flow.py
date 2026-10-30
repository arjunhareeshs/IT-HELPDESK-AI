"""
Verification script for Reference Image & Attachment propagation to Technician:
1. Creates a sample ticket.
2. Simulates uploading a reference image (e.g. PNG screenshot) to the ticket.
3. Verifies that the ticket now returns the image under 'attachments'.
4. Triggers technician assignment.
5. Verifies that the assigned technician's outbox notification payload contains:
   - "reference_images" list
   - "has_images": True
   - Image file name and download URL
6. Simulates Admin uploading another diagnostic reference image to the assigned ticket.
7. Verifies that a "REFERENCE_IMAGE_ADDED" notification is immediately queued in notifications_outbox for the technician.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import get_db_session
from sqlalchemy import select
from app.models.ticket import Ticket
from app.models.attachment import TicketAttachment
from app.models.notification import NotificationOutbox
from app.models.history import TicketHistory
from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo
from app.api.v1.endpoints.attachments import store_attachment


async def verify_reference_image_flow():
    print("=" * 70, flush=True)
    print("VERIFYING REFERENCE IMAGE PROPAGATION TO TECHNICIAN", flush=True)
    print("=" * 70, flush=True)

    # 1. Create a ticket
    complaint = TicketCreate(
        complaint_text="Projector in Room 301 shows flickering blue vertical lines across presentation.",
        building="Main Academic Hall",
        complainant_name="Prof. Harrison Wells",
        complainant_id="prof-wells-88",
        affected_service="Classroom AV",
        college_id="main-campus"
    )
    ticket = await tickets_repo.create_ticket(complaint)
    int_id = int(ticket.ticket_id)
    print(f"[Step 1] Created Ticket #{int_id}", flush=True)

    # 2. Upload initial reference image (complainant or initial attachment)
    # 1x1 valid PNG bytes
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    att1 = store_attachment(int_id, "projector_glitch_photo.png", png_data, "complaint")
    print(f"[Step 2] Stored reference image: {att1.file_name} (ID: {att1.attachment_id})", flush=True)

    # 3. Check ticket retrieval
    fetched = await tickets_repo.get_ticket(str(int_id))
    assert fetched is not None
    assert len(fetched.attachments) >= 1
    ref_img = fetched.attachments[0]
    print(f"[Step 3] Fetched ticket attachments: {len(fetched.attachments)} found", flush=True)
    print(f"         File: {ref_img.file_name}, URL: {ref_img.url}", flush=True)

    # 4. Assign Technician (e.g. Technician ID 1)
    assigned = await tickets_repo.assign_technician(str(int_id), "1", actor="Admin Dispatcher")
    print(f"[Step 4] Assigned technician ID 1 by Admin Dispatcher", flush=True)

    # 5. Check outbox notification for technician
    with get_db_session() as session:
        notif = session.execute(
            select(NotificationOutbox)
            .where(NotificationOutbox.ticket_id == int_id, NotificationOutbox.recipient_user_id == 1)
            .order_by(NotificationOutbox.created_at.desc())
        ).scalars().first()

        assert notif is not None, "Technician outbox notification must exist!"
        payload = notif.payload
        print(f"[Step 5] Checked Outbox notification for Technician #1:", flush=True)
        print(f"         Type: {notif.notification_type}", flush=True)
        print(f"         Has Images: {payload.get('has_images')}", flush=True)
        print(f"         Reference Images in payload: {len(payload.get('reference_images', []))}", flush=True)
        for img in payload.get("reference_images", []):
            print(f"           -> {img['file_name']}: {img['url']}", flush=True)
        assert payload.get("has_images") is True
        assert len(payload.get("reference_images", [])) >= 1

    # 6. Admin uploads an additional diagnostic screenshot while technician is assigned
    att2 = store_attachment(int_id, "admin_switch_diagnostic.png", png_data, "diagnostic")
    print(f"[Step 6] Admin uploaded additional diagnostic image: {att2.file_name}", flush=True)

    # 7. Verify technician gets instant notification about the new reference image
    with get_db_session() as session:
        latest_notif = session.execute(
            select(NotificationOutbox)
            .where(
                NotificationOutbox.ticket_id == int_id,
                NotificationOutbox.recipient_user_id == 1,
                NotificationOutbox.notification_type == "REFERENCE_IMAGE_ADDED"
            )
        ).scalars().first()

        assert latest_notif is not None, "Technician must receive REFERENCE_IMAGE_ADDED notification!"
        print(f"[Step 7] Verified new reference image notification queued for technician:", flush=True)
        print(f"         Type: {latest_notif.notification_type}", flush=True)
        print(f"         File: {latest_notif.payload.get('file_name')}", flush=True)
        print(f"         URL:  {latest_notif.payload.get('url')}", flush=True)
        print(f"         Message: {latest_notif.payload.get('message')}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print("ALL REFERENCE IMAGE FLOW VERIFICATIONS PASSED!", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    import asyncio
    asyncio.run(verify_reference_image_flow())

