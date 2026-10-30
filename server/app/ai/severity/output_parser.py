import json
import re
import logging
from typing import Any, Dict
from pydantic import ValidationError

from app.schemas.priority import SeverityAssessmentOutput

logger = logging.getLogger(__name__)


class OutputParsingError(Exception):
    """Raised when the LLM output cannot be parsed into a valid SeverityAssessmentOutput model."""
    pass


def extract_json_content(content: str) -> str:
    """
    Extracts raw JSON string from potential markdown wrapping or leading/trailing text.
    """
    cleaned = content.strip()
    # Check for markdown code fences
    fence_pattern = r"^```(?:json)?\s*([\s\S]*?)\s*```$"
    match = re.search(fence_pattern, cleaned, re.MULTILINE)
    if match:
        cleaned = match.group(1).strip()
    return cleaned


def parse_llm_output(raw_content: str) -> SeverityAssessmentOutput:
    """
    Parses string content from Ollama response into a validated SeverityAssessmentOutput model.
    Rejects malformed, non-JSON, or incomplete responses.
    Never silently falls back to a default or low severity.
    """
    if not raw_content or not raw_content.strip():
        logger.error("LLM returned empty or whitespace-only response content.")
        raise OutputParsingError("LLM response content is empty.")

    cleaned_content = extract_json_content(raw_content)

    try:
        parsed_json: Dict[str, Any] = json.loads(cleaned_content)
    except json.JSONDecodeError as err:
        logger.error(f"Failed to decode LLM response as JSON: {err}")
        raise OutputParsingError(f"LLM response is not valid JSON: {str(err)}") from err

    if not isinstance(parsed_json, dict):
        logger.error("Parsed LLM output is not a JSON object/dictionary.")
        raise OutputParsingError("LLM output root is not a JSON object.")

    try:
        output_model = SeverityAssessmentOutput.model_validate(parsed_json)
        return output_model
    except ValidationError as err:
        logger.error(f"LLM response failed schema validation: {err}")
        raise OutputParsingError(f"LLM response failed schema validation: {err.errors()}") from err
