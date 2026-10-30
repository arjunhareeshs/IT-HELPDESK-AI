import sys
from pathlib import Path

# Ensure the server directory is prioritized first in sys.path
SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))


# ---------------------------------------------------------------------------
# Test hygiene: tests run against the real database, so remove every ticket
# created in this process once the session ends (and nothing else).
# ---------------------------------------------------------------------------
import pytest


@pytest.fixture(scope="session")
def test_technicians():
    """
    Temporary technicians (the real roster, under @pytest.invalid emails) so allocation can be tested
    whether or not scripts/seed_technicians.py has been run. Removed again afterwards.
    """
    from sqlalchemy import delete, select
    from app.config import settings
    from app.db.seed_data import TECHNICIANS
    from app.db.session import get_db_session
    from app.models.technician import TechnicianBuildingAssignment, TechnicianSkill
    from app.models.user import User

    from app.models.ticket import Ticket

    def purge_test_technicians(session):
        stale = list(session.execute(select(User.user_id).where(User.email.like("%@pytest.invalid"))).scalars())
        if stale:
            for t in session.execute(select(Ticket).where(Ticket.assigned_to_user_id.in_(stale))).scalars():
                t.assigned_to_user_id = None
            session.flush()
            session.execute(delete(TechnicianSkill).where(TechnicianSkill.technician_user_id.in_(stale)))
            session.execute(delete(TechnicianBuildingAssignment).where(TechnicianBuildingAssignment.technician_user_id.in_(stale)))
            session.execute(delete(User).where(User.user_id.in_(stale)))
            session.commit()

    created: list[int] = []
    with get_db_session() as session:
        purge_test_technicians(session)  # leftovers from an aborted earlier run
        for spec in TECHNICIANS:
            email = spec["email"].split("@")[0] + "@pytest.invalid"  # never collide with the real roster
            user = User(full_name=spec["full_name"], email=email, role="IT-Technician",
                        department=spec["department"], building=spec["buildings"][0], is_active=True)
            session.add(user)
            session.flush()
            created.append(user.user_id)
            for category, subs in spec["skills"].items():
                for sub in subs:
                    session.add(TechnicianSkill(technician_user_id=user.user_id, category=category, subcategory=sub))
            for building in spec["buildings"]:
                session.add(TechnicianBuildingAssignment(technician_user_id=user.user_id, building=building))
        session.commit()

    previous_cap = settings.TECH_MAX_ACTIVE_TASKS
    settings.TECH_MAX_ACTIVE_TASKS = 1000  # capacity is exercised explicitly in the allocation tests
    yield created
    settings.TECH_MAX_ACTIVE_TASKS = previous_cap

    with get_db_session() as session:
        purge_test_technicians(session)


@pytest.fixture(scope="session", autouse=True)
def _remove_tickets_created_by_tests(test_technicians):
    from app.repositories.tickets import tickets_repo

    created_ids: list[int] = []
    original = tickets_repo.create_ticket

    async def recording_create(data, *args, **kwargs):
        ticket = await original(data, *args, **kwargs)
        if str(ticket.ticket_id).isdigit():
            created_ids.append(int(ticket.ticket_id))
        return ticket

    tickets_repo.create_ticket = recording_create
    yield
    tickets_repo.create_ticket = original

    if not created_ids:
        return
    from sqlalchemy import delete
    from app.db.session import get_db_session
    from app.models import (
        AIToolCallAudit, NotificationOutbox, Ticket, TicketAIAssessment, TicketAssignment, TicketAttachment,
        TicketCaseMemory, TicketComment, TicketHistory, TicketIncidentLink, TicketResolutionAttempt, TicketSolution,
    )

    with get_db_session() as session:
        # Not every FK in the live schema cascades, so children are removed explicitly.
        for model in (AIToolCallAudit, TicketHistory, TicketAIAssessment, TicketAttachment, TicketAssignment,
                      TicketResolutionAttempt, TicketCaseMemory, NotificationOutbox, TicketComment,
                      TicketIncidentLink, TicketSolution):
            session.execute(delete(model).where(model.ticket_id.in_(created_ids)))
        session.execute(delete(Ticket).where(Ticket.ticket_id.in_(created_ids)))
        session.commit()


@pytest.fixture(autouse=True)
def _research_rounds_for_scripted_models(monkeypatch):
    """Production prefetches all evidence and runs no research rounds; the scripted fake LLMs exercise the tool loop."""
    from app.config import settings

    monkeypatch.setattr(settings, "LLM_RESEARCH_ROUNDS", 3)
