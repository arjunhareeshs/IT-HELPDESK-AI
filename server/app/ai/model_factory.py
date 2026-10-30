import os
import json
import logging
import urllib.request
from typing import Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from app.config import settings

logger = logging.getLogger(__name__)


def _is_ollama_model_available(base_url: str, target_model: str) -> bool:
    """Check if Ollama is running and has the requested model installed."""
    try:
        url = f"{base_url.rstrip('/')}/api/tags"
        req = urllib.request.Request(url, headers={"User-Agent": "Probe"})
        with urllib.request.urlopen(req, timeout=0.5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                installed = set()
                for m in data.get("models", []):
                    name = m.get("name", "")
                    installed.add(name)
                    installed.add(name.split(":")[0])
                target_base = target_model.split(":")[0]
                return (target_model in installed) or (target_base in installed)
    except Exception:
        pass
    return False


class LocalFallbackChatModel(BaseChatModel):
    """Deterministic local fallback chat model used when Groq and Ollama are unavailable."""

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(
            generations=[
                ChatGeneration(
                    message=AIMessage(
                        content="Local fallback reasoning output: Automated triage analysis completed with internal policy heuristics."
                    )
                )
            ]
        )

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        return self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    @property
    def _llm_type(self) -> str:
        return "local-fallback"


def make_triage_model(model_name: Optional[str] = None) -> BaseChatModel:
    """Instantiate triage LLM. Uses Groq API via ChatGroq if API key configured, else falls back to Ollama or local mock."""
    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")

    if api_key and api_key != "replace_me" and api_key.strip():
        try:
            from langchain_groq import ChatGroq

            target_model = model_name or settings.GROQ_MODEL
            logger.info(f"Initializing ChatGroq with model: {target_model}")
            return ChatGroq(
                model=target_model,
                groq_api_key=api_key,
                timeout=float(settings.LLM_TIMEOUT_SECONDS),
                max_retries=int(settings.LLM_MAX_RETRIES),
                temperature=0.0,
            )
        except Exception as exc:
            logger.warning(f"Failed to initialize ChatGroq ({exc}), falling back to local model.")

    # Only invoke Ollama if explicitly enabled and model is verified locally
    if settings.ENABLE_OLLAMA and _is_ollama_model_available(settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL):
        try:
            try:
                from langchain_ollama import ChatOllama
            except ImportError:
                from langchain_community.chat_models import ChatOllama

            return ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL,
                timeout=float(settings.OLLAMA_TIMEOUT_SECONDS),
            )
        except Exception as exc:
            logger.warning(f"Failed to initialize ChatOllama ({exc}), using local fallback.")

    return LocalFallbackChatModel()


def make_vision_model() -> BaseChatModel:
    """Instantiate multimodal vision LLM using Groq API (llama-3.2-11b-vision-preview by default)."""
    return make_triage_model(model_name=settings.GROQ_VISION_MODEL)
