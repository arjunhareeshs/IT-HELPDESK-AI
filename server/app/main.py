from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from app.config import settings
from app.api.v1.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("helpdesk.main")

async def check_groq_models() -> None:
    """Log a clear error if the configured Groq models are not available to this API key."""
    key = (settings.GROQ_API_KEY or "").strip()
    if not key:
        return
    try:
        import httpx

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {key}"})
        if resp.status_code == 401:
            logger.error("GROQ_API_KEY was rejected by Groq (401). Check the key.")
            return
        available = {m["id"] for m in resp.json().get("data", [])}
        for name in (settings.GROQ_MODEL, settings.GROQ_VISION_MODEL):
            if available and name not in available:
                logger.error("Groq model '%s' is not available to this key. Set GROQ_MODEL / GROQ_VISION_MODEL to one of: %s",
                             name, ", ".join(sorted(available)))
    except Exception as exc:
        logger.warning("Could not verify Groq models at startup: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing IT Helpdesk LangChain AI Backend...")
    logger.info(f"Environment: {settings.APP_ENV} | Model: {settings.GROQ_MODEL} | Vision: {settings.GROQ_VISION_MODEL}")
    logger.info(f"LLM Tool Steps Cap: {settings.LLM_MAX_TOOL_STEPS}")
    
    # Verify and ensure database tables on startup
    try:
        from app.db.session import engine
        from app.models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database connection verified and schema tables checked.")
    except Exception as e:
        logger.warning(f"Database schema verification notice: {e}")

    if not (settings.GROQ_API_KEY or "").strip():
        logger.warning(
            "GROQ_API_KEY is not set: triage will use the deterministic keyword fallback instead of an LLM "
            "(unless ENABLE_OLLAMA is on and a local model is available)."
        )
    if settings.ALLOW_MEMORY_FALLBACK:
        logger.warning("ALLOW_MEMORY_FALLBACK is on: database failures fall back to in-memory state (development only).")

    await check_groq_models()

    # Load the classifier weights now, off the event loop, so the first ticket does not wait for them.
    async def _warm_classifier() -> None:
        import time
        from app.ai.classification.predictor import get_model_and_tokenizer
        started = time.perf_counter()
        model, _, device = await asyncio.to_thread(get_model_and_tokenizer)
        logger.info("Classifier %s in %.1fs (device=%s)", "ready" if model is not None else "unavailable, using keyword fallback",
                    time.perf_counter() - started, device)

    from app.api.v1.endpoints.analytics import warm_tickets_cache

    async def _warm_pool() -> None:
        from app.db.session import warm_pool
        try:
            await asyncio.to_thread(warm_pool)
        except Exception as exc:
            logger.warning("DB pool warm-up skipped: %s", exc)

    pool_task = asyncio.create_task(_warm_pool())
    warm_task = asyncio.create_task(_warm_classifier())
    cache_task = asyncio.create_task(warm_tickets_cache())

    from app.workers.email_listener import start_email_listener, stop_email_listener
    from app.workers.triage_sweeper import start_triage_sweeper, stop_triage_sweeper

    email_task = start_email_listener()
    sweeper_task = start_triage_sweeper(poll_interval=20)
    yield
    warm_task.cancel()
    pool_task.cancel()
    cache_task.cancel()
    await stop_triage_sweeper()
    await stop_email_listener(email_task)
    logger.info("Shutting down IT Helpdesk AI Backend...")

app = FastAPI(
    title="AI-Powered IT Helpdesk Service",
    description="LangChain + LangGraph Case-Memory Isolated Triage Agent Architecture",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration for client apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "service": "AI-Powered IT Helpdesk Service",
        "version": "2.0.0",
        "docs_url": "/docs",
        "api_v1": "/api/v1",
        "health": "/api/v1/health",
        "tickets": "/api/v1/tickets"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
