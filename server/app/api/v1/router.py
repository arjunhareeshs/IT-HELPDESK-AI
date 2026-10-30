from fastapi import APIRouter
from app.api.v1.endpoints.tickets import router as tickets_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.triage import router as triage_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.technicians import router as technicians_router
from app.api.v1.endpoints.incidents import router as incidents_router
from app.api.v1.endpoints.attachments import router as attachments_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(tickets_router)
api_router.include_router(triage_router)
api_router.include_router(analytics_router)
api_router.include_router(technicians_router)
api_router.include_router(incidents_router)
api_router.include_router(attachments_router)
