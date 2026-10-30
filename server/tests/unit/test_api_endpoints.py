import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_full_api_endpoints_pipeline():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Analytics dashboard & operational graphs
        res = await client.get("/api/v1/analytics/dashboard")
        assert res.status_code == 200
        stats = res.json()
        assert "active_tickets" in stats
        assert "completed_tickets" in stats

        res = await client.get("/api/v1/analytics/ticket-flow?period=today")
        assert res.status_code == 200
        assert len(res.json()) > 0

        res = await client.get("/api/v1/analytics/category-breakdown")
        assert res.status_code == 200
        assert len(res.json()) > 0

        res = await client.get("/api/v1/analytics/severity-by-category")
        assert res.status_code == 200
        assert len(res.json()) > 0

        res = await client.get("/api/v1/analytics/resolution-time")
        assert res.status_code == 200
        assert len(res.json()) > 0

        res = await client.get("/api/v1/analytics/technician-workload")
        assert res.status_code == 200
        assert len(res.json()) > 0

        res = await client.get("/api/v1/analytics/technicians/category-matrix")
        assert res.status_code == 200
        assert len(res.json()) > 0

        # 3. List technicians
        res = await client.get("/api/v1/technicians")
        assert res.status_code == 200
        techs = res.json()
        assert len(techs) > 0
        tech_id = techs[0]["id"]

        # 4. Create ticket (with immediate triage for testing)
        create_payload = {
            "complaint_text": "Wi-Fi access point in Science Block 3rd floor is repeatedly flapping.",
            "building": "Science Block",
            "complainant_name": "Dr. Kumar",
            "complainant_id": "dr-kumar-01",
            "affected_service": "Campus Wi-Fi"
        }
        res = await client.post("/api/v1/tickets?immediate=true", json=create_payload)
        assert res.status_code == 201
        created_ticket = res.json()
        ticket_id = created_ticket["ticket_id"]
        assert str(ticket_id).isdigit() or ticket_id.startswith("TCK-")
        assert created_ticket["complainant_name"] == "Dr. Kumar"
        assert len(created_ticket["timeline"]) > 0

        # 5. Get ticket by ID
        res = await client.get(f"/api/v1/tickets/{ticket_id}")
        assert res.status_code == 200
        fetched = res.json()
        assert fetched["ticket_id"] == ticket_id

        # 6. Get AI report
        res = await client.get(f"/api/v1/tickets/{ticket_id}/ai-report")
        assert res.status_code == 200
        ai_rep = res.json()
        assert ai_rep["ticket_id"] == ticket_id
        assert "assessment" in ai_rep

        # 7. Assign technician
        assign_payload = {
            "technician_id": tech_id,
            "actor": "Lead Dispatcher"
        }
        res = await client.post(f"/api/v1/tickets/{ticket_id}/assign", json=assign_payload)
        assert res.status_code == 200
        assigned = res.json()
        assert assigned["assigned_technician_id"] == tech_id
        assert assigned["status"] == "ASSIGNED"

        # 8. Technician submits work report
        work_payload = {
            "action_notes": "Replaced POE injector and re-crimped RJ45 patch cable. AP is stable.",
            "actor": "Field Technician"
        }
        res = await client.post(f"/api/v1/tickets/{ticket_id}/work-report", json=work_payload)
        assert res.status_code == 200
        reported = res.json()
        assert reported["status"] == "USER_VERIFICATION"
        assert "POE injector" in reported["action_notes"]

        # 9. Complainant confirms resolution (/confirm alias)
        res = await client.post(f"/api/v1/tickets/{ticket_id}/confirm")
        assert res.status_code == 200
        resolved = res.json()
        assert resolved["status"] == "RESOLVED"

        # 10. Re-evaluate / retriage alias
        res = await client.post(
            f"/api/v1/tickets/{ticket_id}/re-evaluate",
            json={"reason": "Flapping returned during evening classes."}
        )
        assert res.status_code == 200

        # 11. Admin override priority
        override_payload = {
            "priority": "P1",
            "reason": "Midterm exams commencing tomorrow in this building."
        }
        res = await client.post(f"/api/v1/triage/{ticket_id}/override", json=override_payload)
        assert res.status_code == 200
        overridden = res.json()
        assert overridden["priority"] == "P1"
        assert overridden["severity"] == "critical"
