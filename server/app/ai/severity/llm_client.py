import logging
from typing import Any, Dict, Optional
import httpx

from app.config import settings
from app.schemas.priority import SeverityAssessmentInput, SeverityAssessmentOutput
from app.ai.severity.prompts import get_system_prompt, build_user_message

logger = logging.getLogger(__name__)


class LLMClientError(Exception):
    """Base exception for LLM client communication errors."""
    pass


class LLMConnectionError(LLMClientError):
    """Raised when connecting to the LLM service fails."""
    pass


class LLMTimeoutError(LLMClientError):
    """Raised when a request to the LLM service times out."""
    pass


class LLMResponseError(LLMClientError):
    """Raised when the LLM service returns an unexpected or error response."""
    pass


class OllamaClient:
    """
    Asynchronous client for interacting with the Ollama HTTP API.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout_seconds = timeout_seconds or settings.OLLAMA_TIMEOUT_SECONDS
        self._external_client = http_client

    async def generate_assessment(
        self,
        input_data: SeverityAssessmentInput,
        custom_system_prompt: Optional[str] = None
    ) -> str:
        """
        Sends system and user messages to Ollama /api/chat with structured JSON schema format
        and temperature=0 for consistent, deterministic assessments.
        Returns the raw assistant content string.
        """
        system_content = custom_system_prompt or get_system_prompt()
        user_content = build_user_message(input_data)
        schema = SeverityAssessmentOutput.model_json_schema()

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            "stream": False,
            "format": schema,
            "options": {
                "temperature": 0.0
            }
        }

        endpoint = f"{self.base_url}/api/chat"
        headers = {"Content-Type": "application/json"}

        try:
            if self._external_client is not None:
                response = await self._external_client.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout_seconds
                )
            else:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        endpoint,
                        json=payload,
                        headers=headers
                    )

            if response.status_code != 200:
                logger.error(
                    f"Ollama API returned HTTP {response.status_code}: {response.text}"
                )
                raise LLMResponseError(
                    f"LLM service returned non-success status code: {response.status_code}"
                )

            try:
                response_json = response.json()
                if hasattr(response_json, "__await__"):
                    import asyncio
                    response_json = await response_json
            except Exception as err:
                logger.error(f"Failed to decode Ollama response JSON: {err}")
                raise LLMResponseError("Invalid JSON received from LLM service.") from err

            message = response_json.get("message")
            if not isinstance(message, dict) or "content" not in message:
                logger.error(f"Ollama response missing 'message.content': {response_json}")
                raise LLMResponseError("LLM response payload missing 'message.content'.")

            return message["content"]

        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.error(f"Connection failure to Ollama at {self.base_url}: {exc}")
            raise LLMConnectionError(
                "Unable to connect to the severity assessment model service."
            ) from exc

        except httpx.TimeoutException as exc:
            logger.error(f"Timeout while contacting Ollama at {self.base_url}: {exc}")
            raise LLMTimeoutError(
                "The severity assessment model service timed out."
            ) from exc

        except httpx.HTTPError as exc:
            logger.error(f"HTTP error communicating with Ollama: {exc}")
            raise LLMResponseError(
                "An HTTP communication error occurred with the severity assessment model."
            ) from exc


# Global default client instance
default_ollama_client = OllamaClient()
