"""
Technician allocation: skills (category + subcategory) decide who gets a task, occupied technicians
carry an active/busy/offline status, and queued work is handed over when someone frees up.
"""

import pytest
from sqlalchemy import select

from app.config import settings
from app.db.session import get_db_session
from app.models.ticket import Ticket
from app.models.user import User
from app.repositories.technicians import technicians_repo
from app.repositories.tickets import tickets_repo
from app.schemas.ticket import TicketCreate
from app.services.assignment_service import assignment_service


def by_name(techs):
    return {t["name"]: t for t in techs}


async def eligible_names(category, subcategory=None, building=None):
    return [c["name"] for c in await technicians_repo.get_eligible_technicians(category, building, "P3", subcategory)]


async def test_technicians_expose_category_and_subcategory_skills(test_technicians):
    marcus = by_name(await technicians_repo.get_all_technicians())["Marcus Chen"]
    assert {"category": "Network", "subcategory": "Wireless"} in marcus["skills"]
    assert marcus["specialties"] == ["Network"]
    assert "DHCP" in marcus["subcategories"]


async def test_only_technicians_with_the_category_skill_are_eligible(test_technicians):
    # Database work: only Sarah has any Database skill
    assert await eligible_names("Database", "Oracle") == ["Sarah Jenkins"]
    # Nobody is skilled in an unknown category -> nobody is eligible (no arbitrary fallback assignee)
    assert await eligible_names("Plumbing") == []
    # Software/Email: Sarah and Priya both qualify; Marcus (network only) and Tariq (hardware) do not
    assert set(await eligible_names("Software", "Email")) == {"Sarah Jenkins", "Priya Nair"}


async def test_subcategory_match_ranks_above_category_only(test_technicians):
    # Network/VPN: only Marcus lists VPN, Priya is network-only without VPN -> Marcus first
    names = await eligible_names("Network", "VPN")
    assert names[0] == "Marcus Chen"
    top = (await technicians_repo.get_eligible_technicians("Network", None, "P3", "VPN"))[0]
    assert top["subcategory_match"] is True


async def test_building_and_workload_break_ties(test_technicians):
    # Hardware/Monitor: Priya and Tariq both have it; Library West is Priya's building
    assert (await eligible_names("Hardware", "Monitor", building="Library West"))[0] == "Priya Nair"
    assert (await eligible_names("Hardware", "Monitor", building="Central Admin"))[0] == "Tariq Al-Mansoor"


async def test_assignment_service_returns_reason_and_unassigned_when_nobody_fits(test_technicians):
    ok = await assignment_service.assign_technician("x", "Database", "Engineering Hall", "P2", subcategory="DB2")
    assert ok.status == "ASSIGNED" and ok.technician_name == "Sarah Jenkins" and "Database / DB2" in ok.reason
    none = await assignment_service.assign_technician("x", "Plumbing", None, "P2")
    assert none.status == "UNASSIGNED" and none.technician_id is None


async def _ticket(text, building="Science Block"):
    return await tickets_repo.create_ticket(
        TicketCreate(complaint_text=text, building=building, complainant_name="Allocation Tester", complainant_id="alloc")
    )


def _make_queued(ticket_id: str, category: str, subcategory: str | None = None):
    """Put a ticket in the state triage leaves an unassignable ticket in."""
    with get_db_session() as session:
        t = session.get(Ticket, int(ticket_id))
        t.category, t.status, t.priority, t.priority_score = category, "QUEUED", "P2", 70
        t.assigned_to_user_id = None
        session.commit()


async def test_busy_technician_is_excluded_and_status_reports_it(test_technicians, monkeypatch):
    first = await _ticket("Oracle listener down for the finance database.")
    before = by_name(await technicians_repo.get_all_technicians())["Sarah Jenkins"]
    monkeypatch.setattr(settings, "TECH_MAX_ACTIVE_TASKS", before["active_workload"] + 1)
    await tickets_repo.assign_technician(first.ticket_id, before["id"], actor="test")

    sarah = by_name(await technicians_repo.get_all_technicians())["Sarah Jenkins"]
    assert sarah["availability_status"] == "busy" and sarah["available"] is False
    assert first.ticket_id in sarah["active_ticket_ids"] and sarah["active_workload"] == before["active_workload"] + 1
    assert await eligible_names("Database", "Oracle") == []  # her only Database-qualified colleague slot is full


async def test_offline_technician_is_never_chosen(test_technicians):
    with get_db_session() as session:
        sarah = session.execute(select(User).where(User.email == "sarah.jenkins@pytest.invalid")).scalar_one()
        sarah.is_active = False
        session.commit()
    try:
        assert by_name(await technicians_repo.get_all_technicians())["Sarah Jenkins"]["availability_status"] == "offline"
        assert await eligible_names("Database", "Oracle") == []
    finally:
        with get_db_session() as session:
            session.execute(select(User).where(User.email == "sarah.jenkins@pytest.invalid")).scalar_one().is_active = True
            session.commit()


async def test_queued_ticket_is_dispatched_when_the_technician_frees_up(test_technicians, monkeypatch):
    busy_ticket = await _ticket("DB2 backup job keeps failing every night.")
    waiting = await _ticket("MS SQL Server login timeouts for the registrar.")
    sarah = by_name(await technicians_repo.get_all_technicians())["Sarah Jenkins"]
    sarah_id = sarah["id"]
    # Exactly one free slot, whatever earlier tests already gave her
    monkeypatch.setattr(settings, "TECH_MAX_ACTIVE_TASKS", sarah["active_workload"] + 1)

    await tickets_repo.assign_technician(busy_ticket.ticket_id, sarah_id, actor="test")  # Sarah is now full
    _make_queued(waiting.ticket_id, "Database", None)

    assert await assignment_service.dispatch_waiting() == []  # nobody free -> stays queued
    assert (await tickets_repo.get_ticket(waiting.ticket_id)).status == "QUEUED"

    # Sarah submits her report: she is free again, so the queued Database ticket is handed to her
    from app.services.ticket_service import ticket_service
    await ticket_service.submit_work_report(busy_ticket.ticket_id, "Rebuilt the DB2 backup schedule and verified a clean run.")

    after = await tickets_repo.get_ticket(waiting.ticket_id)
    assert after.status == "ASSIGNED" and after.assigned_technician_name == "Sarah Jenkins"
