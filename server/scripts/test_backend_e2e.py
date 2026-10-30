import asyncio
import os
import sys
from pathlib import Path

# Add server to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import get_db_session
from app.models.ticket import Ticket
from app.models.history import TicketHistory
from app.models.assignment import TicketAssignment
from app.models.resolution_attempt import TicketResolutionAttempt


async def run_verification():
    print("=" * 60)
    print("RUNNING END-TO-END BACKEND & DATABASE VERIFICATION")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Endpoint
        res = await client.get("/api/v1/health")
        print(f"[1] GET /api/v1/health -> {res.status_code}: {res.json()}")
        assert res.status_code == 200

        # 2. Technicians Endpoint
        res = await client.get("/api/v1/technicians")
        print(f"[2] GET /api/v1/technicians -> {res.status_code}, Found {len(res.json())} technicians")
        assert res.status_code == 200
        techs = res.json()
        assert len(techs) > 0
        tech_id = techs[0]["id"]
        tech_name = techs[0]["name"]

        # 3. Incidents Endpoint
        res = await client.get("/api/v1/incidents")
        print(f"[3] GET /api/v1/incidents -> {res.status_code}, Found {len(res.json())} active incidents")
        assert res.status_code == 200

        # 4. Analytics Dashboard
        res = await client.get("/api/v1/analytics/dashboard")
        print(f"[4] GET /api/v1/analytics/dashboard -> {res.status_code}")
        assert res.status_code == 200

        # 5. List Tickets
        res = await client.get("/api/v1/tickets")
        print(f"[5] GET /api/v1/tickets -> {res.status_code}, Total tickets: {len(res.json())}")
        assert res.status_code == 200

        # 6. Create Ticket (complaint filing)
        create_payload = {
            "complaint_text": "Wi-Fi access point in Science Block 3rd floor is repeatedly flapping.",
            "building": "Science Block",
            "complainant_name": "Dr. Kumar",
            "complainant_id": "dr-kumar-01",
            "affected_service": "Campus Wi-Fi"
        }
        res = await client.post("/api/v1/tickets?immediate=false", json=create_payload)
        print(f"[6] POST /api/v1/tickets -> {res.status_code}")
        assert res.status_code in (200, 201)
        created_ticket = res.json()
        ticket_id = created_ticket["ticket_id"]
        print(f"    Created Ticket ID: {ticket_id}")

        # 7. Assign Technician
        assign_payload = {
            "technician_id": str(tech_id),
            "actor": "Admin Dispatcher"
        }
        res = await client.post(f"/api/v1/tickets/{ticket_id}/assign", json=assign_payload)
        print(f"[7] POST /api/v1/tickets/{ticket_id}/assign -> {res.status_code}")
        assert res.status_code == 200
        assigned = res.json()
        assert assigned["status"] == "ASSIGNED"
        print(f"    Ticket status updated to: {assigned['status']}")

        # 8. Technician Submits Work Report
        work_payload = {
            "action_notes": "Replaced POE switch port on rack 3 and reset access point firmware to v4.8.",
            "actor": tech_name
        }
        res = await client.post(f"/api/v1/tickets/{ticket_id}/work-report", json=work_payload)
        print(f"[8] POST /api/v1/tickets/{ticket_id}/work-report -> {res.status_code}")
        assert res.status_code == 200
        reported = res.json()
        assert reported["status"] == "USER_VERIFICATION"
        print(f"    Ticket status updated to: {reported['status']}")

        # 9. Complainant Confirms Resolution
        res = await client.post(f"/api/v1/tickets/{ticket_id}/confirm")
        print(f"[9] POST /api/v1/tickets/{ticket_id}/confirm -> {res.status_code}")
        assert res.status_code == 200
        confirmed = res.json()
        assert confirmed["status"] == "RESOLVED"
        print(f"    Ticket status updated to: {confirmed['status']}")

        # 10. Database Persistence Verification in PostgreSQL
        print("\n[10] Verifying PostgreSQL database state directly with SQLAlchemy...")
        with get_db_session() as session:
            # Query latest Ticket
            t = session.query(Ticket).order_by(Ticket.created_at.desc()).first()
            assert t is not None, "Ticket row missing in PostgreSQL!"
            print(f"     [OK] Ticket in PostgreSQL: ID={t.ticket_id}, Status={t.status}, Service={t.affected_service}")

            # Query History entries
            hist_count = session.query(TicketHistory).filter(TicketHistory.ticket_id == t.ticket_id).count()
            print(f"     [OK] Ticket history entries in PostgreSQL: {hist_count}")
            assert hist_count >= 1

            # Query Assignments
            asgn = session.query(TicketAssignment).filter(TicketAssignment.ticket_id == t.ticket_id).first()
            if asgn:
                print(f"     [OK] Assignment record in PostgreSQL: Tech ID={asgn.technician_user_id}, Status={asgn.assignment_status}")

            # Query Resolution Attempts
            att = session.query(TicketResolutionAttempt).filter(TicketResolutionAttempt.ticket_id == t.ticket_id).first()
            if att:
                print(f"     [OK] Resolution attempt in PostgreSQL: Status={att.verification_status}, Summary={att.resolution_summary[:40]}...")

    print("\n" + "=" * 60)
    print("ALL TESTS & VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_verification())
