import logging
from typing import Optional, Union

from app.schemas.priority import (
    SeverityAssessmentInput,
    SeverityAssessmentOutput,
)
from app.ai.severity.llm_client import (
    OllamaClient,
    default_ollama_client,
    LLMClientError,
)
from app.ai.severity.output_parser import parse_llm_output, OutputParsingError
from app.ai.severity.validator import (
    validate_assessment,
    create_fallback_assessment,
    SeverityValidationError,
)

logger = logging.getLogger(__name__)


class PriorityService:
    """
    Coordinates ticket severity assessment using the LLM integration.
    Keeps API, model communication, and business validation separated.
    Guarantees that assessments cannot automatically close tickets, execute fixes,
    or suppress critical incidents.
    """

    def __init__(self, client: Optional[OllamaClient] = None):
        self.client = client or default_ollama_client

    async def assess_severity(
        self,
        ticket_id: str,
        complaint_text: str,
        predicted_category: str,
        classification_confidence: Optional[float] = None,
        building: Optional[str] = None,
        affected_users: Optional[Union[int, str]] = None,
        affected_service: Optional[str] = None,
        deadline: Optional[str] = None,
        additional_context: Optional[str] = None,
        fallback_on_error: bool = True
    ) -> SeverityAssessmentOutput:
        """
        Constructs the typed input model, queries the LLM via client, parses the response,
        validates constraints, and returns a verified SeverityAssessmentOutput.
        """
        input_data = SeverityAssessmentInput(
            ticket_id=ticket_id,
            complaint_text=complaint_text,
            predicted_category=predicted_category,
            classification_confidence=classification_confidence,
            building=building,
            affected_users=affected_users,
            affected_service=affected_service,
            deadline=deadline,
            additional_context=additional_context
        )

        return await self.assess_severity_from_input(input_data, fallback_on_error=fallback_on_error)

    async def assess_severity_from_input(
        self,
        input_data: SeverityAssessmentInput,
        fallback_on_error: bool = True
    ) -> SeverityAssessmentOutput:
        """
        Performs severity assessment on a pre-constructed typed input model.
        """
        try:
            # 1. Query LLM client
            raw_response = await self.client.generate_assessment(input_data)

            # 2. Parse response JSON into Pydantic schema
            parsed_output = parse_llm_output(raw_response)

            # 3. Validate logical constraints and human review triggers
            validated_output = validate_assessment(parsed_output, raise_on_invalid=not fallback_on_error)

            return validated_output

        except (LLMClientError, OutputParsingError, SeverityValidationError) as err:
            logger.warning(
                f"Severity assessment for ticket {input_data.ticket_id} failed: {err}"
            )
            if not fallback_on_error:
                raise

            # Controlled fallback marking ticket for human review without inventing severity
            return create_fallback_assessment(
                reason=f"System error during severity assessment: {str(err)}"
            )


# Default singleton instance of PriorityService
priority_service = PriorityService()
