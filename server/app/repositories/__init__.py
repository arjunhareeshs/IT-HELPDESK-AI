from app.repositories.tickets import tickets_repo, TicketsRepository
from app.repositories.technicians import technicians_repo, TechniciansRepository
from app.repositories.policies import policies_repo, PoliciesRepository
from app.repositories.resolutions import resolutions_repo, ResolutionsRepository
from app.repositories.incidents import incidents_repo, IncidentsRepository

__all__ = [
    "tickets_repo",
    "TicketsRepository",
    "technicians_repo",
    "TechniciansRepository",
    "policies_repo",
    "PoliciesRepository",
    "resolutions_repo",
    "ResolutionsRepository",
    "incidents_repo",
    "IncidentsRepository",
]

