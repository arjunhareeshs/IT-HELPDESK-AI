from fastapi import APIRouter
from app.config import settings
from app.workers.email_listener import listener_state

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "groq_model": settings.GROQ_MODEL,
        "groq_vision_model": settings.GROQ_VISION_MODEL,
        "llm_max_tool_steps": settings.LLM_MAX_TOOL_STEPS,
        "email_listener": dict(listener_state),
        "architecture": "LangChain + LangGraph Case Memory Isolated IT Helpdesk"
    }
