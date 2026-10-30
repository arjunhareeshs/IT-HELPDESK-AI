import pytest
import asyncio
from app.ai.tools.sql_read_tools import validate_sql_query
from app.schemas.triage import TriageAssessment, EvidenceItem, CaseFacts, TicketCaseMemory
from app.ai.validation import validate_triage_assessment
from app.services.priority_policy import priority_policy_engine
from app.services.queue_service import queue_service
from app.services.assignment_service import assignment_service
from app.services.triage_service import triage_service
from app.schemas.ticket import TicketCreate
from app.repositories.tickets import tickets_repo


# ==========================================
# 1. SQL Parser & Defense Tests (sqlglot)
# ==========================================

def test_sql_validator_allows_valid_select():
    sql = "SELECT ticket_id, category, resolution_summary FROM ai_resolution_search_v WHERE category = 'Network' LIMIT 5"
    is_valid, err, tables = validate_sql_query(sql, table_scope="ai_resolution_search_v")
    assert is_valid is True
    assert err is None
    assert "ai_resolution_search_v" in tables

def test_sql_validator_rejects_dml_update():
    sql = "UPDATE tickets SET status = 'RESOLVED' WHERE ticket_id = 'TCK-001'"
    is_valid, err, tables = validate_sql_query(sql)
    assert is_valid is False
    assert "Disallowed statement type" in err

def test_sql_validator_rejects_dml_delete():
    sql = "DELETE FROM ai_resolution_search_v WHERE ticket_id = 'TCK-001'"
    is_valid, err, tables = validate_sql_query(sql, table_scope="ai_resolution_search_v")
    assert is_valid is False
    assert "Disallowed statement type" in err

def test_sql_validator_rejects_sql_injection_multiple_statements():
    sql = "SELECT * FROM ai_resolution_search_v; DROP TABLE tickets;"
    is_valid, err, tables = validate_sql_query(sql, table_scope="ai_resolution_search_v")
    assert is_valid is False
    assert "Multiple SQL statements" in err

def test_sql_validator_rejects_unapproved_table():
    sql = "SELECT * FROM users_passwords WHERE id = 1"
    is_valid, err, tables = validate_sql_query(sql, table_scope="users_passwords")
    assert is_valid is False
    assert "not in allowlist" in err

def test_sql_validator_rejects_system_catalogs():
    sql = "SELECT usename FROM pg_user"
    is_valid, err, tables = validate_sql_query(sql, table_scope="pg_user")
    assert is_valid is False
    assert "not in allowlist" in err


# ==========================================
# 2. Case Memory Isolation Tests
# ==========================================

@pytest.mark.asyncio
async def test_case_memory_isolation_per_ticket():
    # Create ticket 1
    t1 = await tickets_repo.create_ticket(TicketCreate(
        complaint_text="Wi-Fi router down in Library",
        complainant_name="Alice",
        complainant_id="user-alice",
        building="Library",
        college_id="eng-college"
    ))

    # Create ticket 2
    t2 = await tickets_repo.create_ticket(TicketCreate(
        complaint_text="Projector broken in Room 302",
        complainant_name="Bob",
        complainant_id="user-bob",
        building="Science Block",
        college_id="science-college"
    ))

    # Check memories are completely distinct
    mem1 = await tickets_repo.get_case_memory(t1.ticket_id)
    mem2 = await tickets_repo.get_case_memory(t2.ticket_id)

    assert mem1 is not None
    assert mem2 is not None
    assert mem1.ticket_id == t1.ticket_id
    assert mem2.ticket_id == t2.ticket_id
    assert "Library" in mem1.case_facts.confirmed_facts[0]
    assert "Science Block" in mem2.case_facts.confirmed_facts[0]
    assert "Library" not in mem2.case_facts.confirmed_facts[0]


# ==========================================
# 3. Structured Output & Validation Rules
# ==========================================

def test_validator_rejects_ticket_id_mismatch():
    assessment = TriageAssessment(
        ticket_id="TCK-9999",
        category_from_classifier="Network",
        severity="high",
        urgency="urgent",
        impact_scope="multiple_users",
        service_impact="Switch offline",
        evidence=[EvidenceItem(source_type="complaint", observation="No network", supports="severity")],
        similar_ticket_ids=[],
        suggested_next_step="Inspect router",
        missing_information=[],
        requires_human_review=False,
        confidence_level="high",
        explanation="Testing ID mismatch"
    )

    with pytest.raises(ValueError, match="mismatched ticket_id"):
        validate_triage_assessment(
            assessment=assessment,
            expected_ticket_id="TCK-0001",
            expected_category="Network",
            valid_similar_ids=[]
        )

def test_validator_rejects_altered_category():
    assessment = TriageAssessment(
        ticket_id="TCK-0001",
        category_from_classifier="Hardware",
        severity="medium",
        urgency="normal",
        impact_scope="single_user",
        service_impact="Monitor flickering",
        evidence=[EvidenceItem(source_type="complaint", observation="Flickering", supports="severity")],
        similar_ticket_ids=[],
        suggested_next_step="Check cable",
        missing_information=[],
        requires_human_review=False,
        confidence_level="medium",
        explanation="Testing category change"
    )

    with pytest.raises(ValueError, match="altered classifier category"):
        validate_triage_assessment(
            assessment=assessment,
            expected_ticket_id="TCK-0001",
            expected_category="Network",
            valid_similar_ids=[]
        )

def test_validator_flags_unknown_severity_for_human_review():
    assessment = TriageAssessment(
        ticket_id="TCK-0001",
        category_from_classifier="Network",
        severity="unknown",
        urgency="undetermined",
        impact_scope="unknown",
        service_impact="Unknown impact",
        evidence=[EvidenceItem(source_type="complaint", observation="Report ambiguous", supports="severity")],
        similar_ticket_ids=[],
        suggested_next_step="Request more info",
        missing_information=["Device model"],
        requires_human_review=False,
        confidence_level="low",
        explanation="Ambiguous complaint"
    )

    validated = validate_triage_assessment(
        assessment=assessment,
        expected_ticket_id="TCK-0001",
        expected_category="Network",
        valid_similar_ids=[]
    )
    assert validated.requires_human_review is True


# ==========================================
# 4. Deterministic Priority & SLA Rules
# ==========================================

def test_priority_engine_widespread_immediate_yields_p1():
    assessment = TriageAssessment(
        ticket_id="TCK-0001",
        category_from_classifier="Network",
        severity="critical",
        urgency="immediate",
        impact_scope="widespread",
        service_impact="Entire campus exam hall Wi-Fi down",
        evidence=[EvidenceItem(source_type="complaint", observation="All APs dead", supports="severity")],
        similar_ticket_ids=[],
        suggested_next_step="Dispatch network team",
        missing_information=[],
        requires_human_review=False,
        confidence_level="high",
        explanation="Severe outage"
    )

    priority, sla_hours, needs_review, deadline = priority_policy_engine.calculate_priority_and_sla(assessment)
    assert priority == "P1"
    assert sla_hours == 2
    assert needs_review is False

def test_priority_engine_routine_low_yields_p4():
    assessment = TriageAssessment(
        ticket_id="TCK-0002",
        category_from_classifier="Software",
        severity="low",
        urgency="normal",
        impact_scope="single_user",
        service_impact="Request for text editor upgrade",
        evidence=[EvidenceItem(source_type="complaint", observation="Non-urgent software request", supports="severity")],
        similar_ticket_ids=[],
        suggested_next_step="Send software portal link",
        missing_information=[],
        requires_human_review=False,
        confidence_level="high",
        explanation="Routine task"
    )

    priority, sla_hours, needs_review, deadline = priority_policy_engine.calculate_priority_and_sla(assessment)
    assert priority == "P4"
    assert sla_hours == 72


# ==========================================
# 5. Deterministic Queue & Technician Assignment
# ==========================================

@pytest.mark.asyncio
async def test_assignment_service_matches_specialty():
    decision = await assignment_service.assign_technician(
        ticket_id="TCK-TEST",
        category="Network",
        building="Examination Complex",
        priority="P1"
    )
    assert decision.status == "ASSIGNED"
    assert decision.technician_id is not None
    # Marcus Chen and Priya Nair are both Network-skilled for this building; the less-loaded one wins.
    assert decision.technician_name in ("Marcus Chen", "Priya Nair")


# ==========================================
# 6. End-to-End Triage Lifecycle
# ==========================================

@pytest.mark.asyncio
async def test_end_to_end_triage_flow():
    ticket = await tickets_repo.create_ticket(TicketCreate(
        complaint_text="The core router in Tech Hub A has failed. No internet across the building.",
        complainant_name="Prof. Raman",
        complainant_id="prof-raman-01",
        building="Tech Hub A",
        college_id="main-campus"
    ))

    report = await triage_service.triage_ticket(ticket.ticket_id, college_id="main-campus")

    assert report.ticket_id == ticket.ticket_id
    assert report.final_priority in ("P1", "P2", "P3")
    assert report.sla_target_hours > 0
    assert report.assigned_technician_name is not None
    assert len(report.assessment.evidence) > 0

    # Verify case memory was updated
    case_mem = await tickets_repo.get_case_memory(ticket.ticket_id)
    assert case_mem is not None
    assert case_mem.ticket_id == ticket.ticket_id
    assert len(case_mem.case_facts.confirmed_facts) > 0


# ==========================================
# 7. Groq Integration & Model Factory Tests
# ==========================================

from unittest.mock import patch
from app.config import settings
from app.ai.model_factory import make_triage_model, make_vision_model


def test_groq_configuration_defaults():
    assert settings.GROQ_MODEL == "openai/gpt-oss-120b"
    assert settings.GROQ_VISION_MODEL == "qwen/qwen3.8-27b"


def test_make_triage_model_instantiates_chat_groq():
    with patch.object(settings, "GROQ_API_KEY", "gsk_test_mock_groq_api_key"):
        model = make_triage_model()
        from langchain_groq import ChatGroq
        assert isinstance(model, ChatGroq)
        assert model.model_name == settings.GROQ_MODEL
        assert float(model.temperature) < 0.01


def test_make_vision_model_instantiates_groq_vision():
    with patch.object(settings, "GROQ_API_KEY", "gsk_test_mock_groq_api_key"):
        model = make_vision_model()
        from langchain_groq import ChatGroq
        assert isinstance(model, ChatGroq)
        assert model.model_name == settings.GROQ_VISION_MODEL


def test_make_triage_model_falls_back_when_no_api_key():
    with patch.object(settings, "GROQ_API_KEY", None):
        with patch.dict("os.environ", {}, clear=True):
            model = make_triage_model()
            # Falls back to Ollama or LocalFallbackChatModel without crashing
            assert hasattr(model, "invoke") or hasattr(model, "ainvoke")

