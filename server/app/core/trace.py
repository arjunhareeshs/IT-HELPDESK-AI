"""Readable terminal trace of one triage run: what goes into / comes out of each model and tool."""

import json
import logging
from typing import Any

from app.config import settings

_log = logging.getLogger("helpdesk.trace")
_MAX_CHARS = 1800


def _fmt(value: Any, limit: int = _MAX_CHARS) -> str:
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    text = value if isinstance(value, str) else json.dumps(value, default=str, indent=2, ensure_ascii=False)
    if limit and len(text) > limit:
        text = text[:limit] + f"\n... [{len(text) - limit} more chars truncated]"
    return text


def trace(ticket_id: Any, title: str, payload: Any = None, limit: int = _MAX_CHARS) -> None:
    """Print a titled block for this ticket (no-op when TRIAGE_TRACE is off)."""
    if not settings.TRIAGE_TRACE:
        return
    body = "" if payload is None else "\n" + "\n".join("    | " + line for line in _fmt(payload, limit).splitlines())
    _log.info("[TRIAGE #%s] >>> %s%s", ticket_id, title, body)


def render_messages(messages: list[Any], system_chars: int = 300) -> str:
    """Chat messages as plain readable text (system prompt shortened, real line breaks)."""
    parts = []
    for m in messages:
        role = type(m).__name__.replace("Message", "")
        content = m.content if isinstance(m.content, str) else json.dumps(m.content, default=str)
        if role == "System" and len(content) > system_chars:
            content = content[:system_chars] + " ..."
        parts.append(f"--- {role} ---\n{content}")
    return "\n".join(parts)
