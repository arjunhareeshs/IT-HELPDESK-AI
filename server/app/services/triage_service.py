"""
End-to-End Triage Orchestration Service.
Orchestrates:
1. Supervised ML classification (XLM-RoBERTa)
2. Scoped ticket case memory loading
3. Scoped LangChain tool creation (business tools + bounded SQL)
4. Research agent execution (bounded steps)
5. Structured LLM assessment (Pydantic schema validation)
6. Deterministic Priority and SLA calculation (policy engine)
7. Deterministic Queue and technician assignment
8. Transactional persistence, case memory updates, and event notifications
"""

import asyncio
import logging
import time
import uuid
from typing import Optional, Dict, Any
from app.ai.classification.predictor import classify_complaint
from app.ai.classification.llm_classifier import classify_with_llm
from app.ai.model_factory import make_triage_model
from app.ai.tools.tool_registry import get_scoped_tools
from app.ai.agent import run_research_agent
from app.ai.vision import collect_image_evidence
from app.ai.severity.structured_assessor import assess_ticket
from app.services.priority_policy import priority_policy_engine
from app.services.queue_service import queue_service
from app.services.assignment_service import assignment_service
from app.services.notification_service import notification_service
from app.services import email_notifications
from app.repositories.tickets import tickets_repo
from app.repositories.policies import policies_repo
from app.config import settings
from app.core.trace import trace
from app.schemas.triage import AIReportResponse, TriageAssessment, CaseFacts

logger = logging.getLogger("helpdesk.triage")

# Tickets currently being triaged. The create-ticket background task and the sweeper both pick up
# AI_PENDING tickets, so without this guard one ticket was triaged twice (double LLM spend, 429s).
_IN_FLIGHT: set[str] = set()


class _Flow:
    """Prints each triage stage with its result and timing so progress is visible in the terminal."""

    def __init__(self, ticket_id: str):
        self.tag = f"[TRIAGE #{ticket_id}]"
        self.t0 = time.perf_counter()
        self._last = self.t0

    def step(self, name: str, result: str = "") -> None:
        now = time.perf_counter()
        logger.info("%s %-22s %s (+%.1fs, total %.1fs)", self.tag, name, result, now - self._last, now - self.t0)
        self._last = now


class TriageService:
    async def triage_ticket(
        self,
        ticket_id: str,
        college_id: str = "default-org",
        is_retriage: bool = False,
        retriage_reason: Optional[str] = None,
        category_source: str = "ml",
    ) -> AIReportResponse:
        run_id = uuid.uuid4().hex
        flow = _Flow(ticket_id)
        logger.info("%s START retriage=%s category_source=%s", flow.tag, is_retriage, category_source)

        # 1. Load Ticket from repository
        ticket = await tickets_repo.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")
        flow.step("1 ticket loaded", f"building={ticket.building!r} text={ticket.complaint_text[:70]!r}")

        model = make_triage_model()

        # 2. Category: the supervised ML model for web tickets; for email complaints the LLM chooses it
        #    (falls back to ML if the LLM is unavailable). The research LLM never re-classifies.
        trace(ticket_id, f"ML MODEL INPUT (source={category_source})", {"text": ticket.complaint_text})
        if category_source == "llm":
            classifier_result = await classify_with_llm(ticket.complaint_text, model)
        else:
            classifier_result = await asyncio.to_thread(classify_complaint, ticket.complaint_text)
            if classifier_result.confidence < settings.ML_CONFIDENCE_THRESHOLD:
                trace(ticket_id, f"ML confidence {classifier_result.confidence} < {settings.ML_CONFIDENCE_THRESHOLD}: LLM classifies instead",
                      classifier_result)
                category_source = "llm (low ML confidence)"
                classifier_result = await classify_with_llm(ticket.complaint_text, model)
        trace(ticket_id, "ML MODEL OUTPUT", classifier_result)
        flow.step(
            "2 classified",
            f"{classifier_result.predicted_category} / {classifier_result.predicted_subcategory} "
            f"conf={classifier_result.confidence} via {category_source}",
        )

        # 3. Retrieve isolated Ticket Case Memory (strictly keyed by ticket_id)
        case_mem = await tickets_repo.get_case_memory(ticket_id)
        current_case_facts = case_mem.case_facts if case_mem else CaseFacts(
            reported_service=ticket.predicted_category or "IT Support",
            observed_impact=ticket.complaint_text[:200],
            confirmed_facts=[],
            latest_ticket_status="AI_PENDING"
        )

        # 4. Build authorized scoped tools for this ticket & tenant
        scoped_tools = get_scoped_tools(
            current_ticket_id=ticket_id,
            allowed_college_id=ticket.college_id or college_id
        )

        # Image evidence (only this ticket's own attachments; never blocks triage)
        image_evidence = await collect_image_evidence(ticket_id, ticket.complaint_text)
        flow.step("3 context ready", f"images={len(image_evidence['attached_images'])}")

        ml_output_label = (
            f"{classifier_result.predicted_category} - {classifier_result.predicted_subcategory}"
            if classifier_result.predicted_subcategory
            else classifier_result.predicted_category
        )

        ticket_payload = {
            "ticket_id": str(ticket_id),
            "complaint_text": ticket.complaint_text,
            "building": ticket.building,
            "college_id": ticket.college_id,
            "category": classifier_result.predicted_category,
            "subcategory": classifier_result.predicted_subcategory,
            "ml_model_output": ml_output_label,
            "ml_confidence": classifier_result.confidence,
            "timestamp": ticket.created_at.isoformat() if ticket.created_at else None,
            "attached_images": image_evidence["attached_images"],
            "image_analysis": image_evidence["image_analysis"],
            # Memory is keyed by ticket_id: only THIS ticket's own facts are ever supplied.
            "case_facts": current_case_facts.model_dump(),
            "is_retriage": is_retriage,
            "retriage_reason": retriage_reason,
        }

        # 5. Run LangChain Research Agent (bounded tool loop, no writes)
        evidence_pack, tool_trace = await run_research_agent(
            model=model,
            tools=scoped_tools,
            ticket_payload=ticket_payload,
            classifier_result=classifier_result.model_dump(),
        )
        flow.step(
            "4 research agent",
            f"{len(tool_trace)} tool call(s): " + ", ".join(f"{t.get('tool')}[{t.get('status')}]" for t in tool_trace),
        )

        # 6. Structured LLM Assessment (JSON Schema + Pydantic validation)
        assessment: TriageAssessment = await assess_ticket(
            model=model,
            ticket_payload=ticket_payload,
            classifier_result=classifier_result.model_dump(),
            evidence_pack=evidence_pack
        )
        flow.step(
            "5 LLM assessment",
            f"severity={assessment.severity} urgency={assessment.urgency} impact={assessment.impact_scope} "
            f"review={assessment.requires_human_review}",
        )

        # 7. Deterministic Priority, Score and SLA Calculation (Rule matrix)
        category_policy = await policies_repo.get_category_policy(classifier_result.predicted_category)
        final_priority, sla_hours, needs_human_review, sla_deadline = priority_policy_engine.calculate_priority_and_sla(
            assessment=assessment,
            category_policy=category_policy
        )

        priority_score = priority_policy_engine.calculate_priority_score(
            priority=final_priority,
            urgency=assessment.urgency,
            impact=assessment.impact_scope,
        )
        flow.step("6 priority & SLA", f"{final_priority} score={priority_score} sla={sla_hours}h")

        # 9. Deterministic Technician Assignment
        assignment = await assignment_service.assign_technician(
            ticket_id=ticket_id,
            category=classifier_result.predicted_category,
            building=ticket.building,
            priority=final_priority,
            subcategory=classifier_result.predicted_subcategory,
        )
        flow.step("7 assignment", f"{assignment.status} -> {assignment.technician_name or 'queue (no technician)'}")

        # 10. Determine Final Status & Atomic Persistence
        if needs_human_review or assessment.severity == "unknown":
            final_status = "NEEDS_HUMAN_REVIEW"
        elif assignment.status == "ASSIGNED" and assignment.technician_id:
            final_status = "ASSIGNED"
        else:
            final_status = "QUEUED"

        trace(ticket_id, "INGEST INTO DB (ticket update)", {
            "category": classifier_result.predicted_category,
            "subcategory": classifier_result.predicted_subcategory,
            "severity": assessment.severity,
            "priority": final_priority,
            "priority_score": priority_score,
            "status": final_status,
            "assigned_technician": assignment.technician_name,
            "sla_hours": sla_hours,
        })

        # Update ticket record in PostgreSQL (ingest into queue with priority_score and queued_at timestamp)
        await tickets_repo.update_ticket_triage(
            ticket_id=ticket_id,
            category=classifier_result.predicted_category,
            subcategory=classifier_result.predicted_subcategory,
            severity=assessment.severity,
            priority=final_priority,
            status=final_status,
            assigned_tech_id=assignment.technician_id,
            assigned_tech_name=assignment.technician_name,
            assessment=assessment,
            priority_score=priority_score,
            classification_confidence=classifier_result.confidence,
            model_name=type(model).__name__,
            model_version=classifier_result.model_version,
        )
        flow.step("8 saved to DB", f"status={final_status}")

        # Email complaints: tell the sender who is handling it (no-op for web tickets)
        if assignment.technician_id:
            email_notifications.queue_assigned_mail(ticket_id, assignment.technician_name, final_priority)

        # 8. Deterministic queue position, computed from the live queue AFTER ingestion
        queue_info = queue_service.calculate_queue_position(
            ticket_id=ticket_id,
            final_priority=final_priority,
            sla_target_hours=sla_hours,
            sla_deadline=sla_deadline,
            college_id=ticket.college_id or college_id,
        )

        # Save structured assessment in cache
        tickets_repo.save_assessment(ticket_id, assessment)

        # Update ticket-only case memory
        await tickets_repo.update_case_memory(ticket_id, assessment)

        # Persist tool audit trace to database (blocking SQLAlchemy -> worker thread)
        def _persist_audit() -> None:
            from app.db.session import get_db_session
            from app.models.audit import AIToolCallAudit
            with get_db_session() as session:
                int_id = tickets_repo._parse_id(ticket_id)
                for trace in tool_trace:
                    session.add(AIToolCallAudit(
                        ticket_id=int_id,
                        run_id=run_id,
                        tool_name=trace.get("tool") or "unknown_tool",
                        tool_arguments=trace.get("args"),
                        result_reference={"summary": trace.get("output_summary"), "forced_by_backend": bool(trace.get("forced"))},
                        execution_status=trace.get("status", "success"),
                        execution_time_ms=trace.get("duration_ms"),
                    ))
                session.commit()

        try:
            await asyncio.to_thread(_persist_audit)
        except Exception:
            logger.exception("Failed to persist tool-call audit for ticket %s", ticket_id)

        # Add event log
        event_note = (
            f"Automated triage finished: Priority {final_priority} (score {priority_score}), "
            f"Status {final_status}, queue position {queue_info.queue_position}"
        )
        if is_retriage:
            event_note = f"Re-triage completed ({retriage_reason or 'manual trigger'}): {event_note}"
        tickets_repo.add_ticket_event(ticket_id, "AI_TRIAGE_COMPLETED", event_note)

        # Queue Notification if assigned
        if assignment.technician_id:
            notification_service.queue_assignment_notification(
                ticket_id=ticket_id,
                technician_id=assignment.technician_id,
                priority=final_priority,
                category=classifier_result.predicted_category,
                service_impact=assessment.service_impact
            )

        flow.step("9 done", f"RESULT {final_priority} / {final_status} / queue #{queue_info.queue_position}")

        # Reload updated case facts
        updated_mem = await tickets_repo.get_case_memory(ticket_id)
        final_case_facts = updated_mem.case_facts if updated_mem else current_case_facts

        return AIReportResponse(
            ticket_id=ticket_id,
            assessment=assessment,
            final_priority=final_priority,
            sla_target_hours=float(sla_hours),
            assigned_technician_id=assignment.technician_id,
            assigned_technician_name=assignment.technician_name,
            tool_audit_trace=tool_trace,
            case_facts=final_case_facts,
            ml_model_output=ml_output_label,
            priority_score=priority_score,
            queue_position=queue_info.queue_position,
            queue_position_as_of=queue_info.queue_position_as_of.isoformat(),
        )

    async def triage_ticket_safe(
        self, ticket_id: str, college_id: str = "default-org", category_source: str = "ml"
    ) -> Optional[AIReportResponse]:
        """Background-job entry point: never raises, and never leaves a ticket stuck in AI_PENDING."""
        key = str(ticket_id)
        if key in _IN_FLIGHT:
            logger.debug("[TRIAGE #%s] already running, skipping duplicate trigger", key)
            return None
        _IN_FLIGHT.add(key)
        try:
            return await self.triage_ticket(ticket_id, college_id, category_source=category_source)
        except Exception as exc:
            logger.exception("[TRIAGE #%s] FAILED", key)
            await tickets_repo.mark_triage_failed(ticket_id, f"{type(exc).__name__}: {exc}")
            return None
        finally:
            _IN_FLIGHT.discard(key)

triage_service = TriageService()
