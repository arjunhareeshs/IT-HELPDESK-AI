import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine possible .env paths
CURRENT_DIR = Path(__file__).resolve().parent
SERVER_DIR = CURRENT_DIR.parent
ROOT_DIR = SERVER_DIR.parent

ENV_FILES = [
    str(SERVER_DIR / ".env"),
    str(ROOT_DIR / ".env"),
    ".env",
]


class Settings(BaseSettings):
    PROJECT_NAME: str = "IT Helpdesk AI Triage"
    VERSION: str = "0.0.1"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = Field(default="development", description="Application environment")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/it_helpdesk",
        description="PostgreSQL connection string (Supabase / Render / Local)"
    )

    # Groq & LangChain Model Configuration
    GROQ_API_KEY: str | None = Field(default=None, description="Groq API key")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile", description="Groq model identifier for reasoning and tool calling")
    GROQ_VISION_MODEL: str = Field(default="llama-3.2-11b-vision-preview", description="Groq vision model identifier for image analysis")
    LLM_TIMEOUT_SECONDS: float = Field(default=30.0, description="LLM call timeout in seconds")
    LLM_MAX_RETRIES: int = Field(default=5, description="Maximum LLM API retries")
    LLM_MAX_TOOL_STEPS: int = Field(default=6, description="Hard cap on tool calls per triage run")
    LLM_RESEARCH_ROUNDS: int = Field(default=0, description="Extra tool-calling LLM rounds before the final assessment (0 = evidence is prefetched, one LLM call per ticket)")
    ML_CONFIDENCE_THRESHOLD: float = Field(default=0.6, description="Web tickets whose ML confidence is below this are classified by the LLM instead")
    TRIAGE_TRACE: bool = Field(default=True, description="Print model inputs/outputs and tool calls for every triage run in the terminal")
    LLM_MAX_TOOL_ROWS: int = Field(default=25, description="Maximum rows returned by investigative queries")
    LLM_MAX_QUEUE_ITEMS: int = Field(default=100, description="Maximum queue items returned by the queue snapshot tool")
    LLM_QUERY_TIMEOUT_MS: int = Field(default=1500, description="Database statement timeout for tool queries")
    LLM_QUERY_MAX_REPAIR_ATTEMPTS: int = Field(default=2, description="Maximum bounded query repair attempts")

    # Runtime behaviour
    ALLOW_MEMORY_FALLBACK: bool = Field(
        default=True,
        description="If true, repositories fall back to in-memory state when PostgreSQL is unreachable (dev/tests only). Set false in production so DB failures surface as errors.",
    )
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,*",
        description="Comma-separated list of allowed browser origins",
    )
    TECH_MAX_ACTIVE_TASKS: int = Field(
        default=5,
        description="A technician with this many active tasks (ASSIGNED / IN_PROGRESS / REWORK_REQUESTED) is busy and gets no new automatic assignments",
    )

    # Free Cloud Storage: Supabase Storage (1GB Free persistent tier)
    SUPABASE_URL: str | None = Field(default=None, description="Supabase project URL, e.g. https://xyz.supabase.co")
    SUPABASE_KEY: str | None = Field(default=None, description="Supabase API key (service_role or anon key)")
    SUPABASE_STORAGE_BUCKET: str = Field(default="ticket-attachments", description="Supabase Storage bucket name")

    # Local Attachment Directory Fallback (for local offline dev)
    UPLOAD_DIR: str = Field(default="uploads", description="Directory (relative to server/) for ticket attachments")
    MAX_UPLOAD_BYTES: int = Field(default=5 * 1024 * 1024, description="Maximum attachment size in bytes (5 MB)")

    # Email intake: mails whose subject is EMAIL_COMPLAINT_SUBJECT become tickets
    EMAIL_ENABLED: bool = Field(default=False, description="Start the IMAP listener with the API server")
    EMAIL_ADDRESS: str | None = Field(default=None, description="Mailbox address (e.g. a Gmail account)")
    EMAIL_APP_PASSWORD: str | None = Field(default=None, description="App password for the mailbox (never commit it)")
    IMAP_SERVER: str = Field(default="imap.gmail.com")
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    EMAIL_POLL_SECONDS: int = Field(default=10, description="Seconds between inbox checks")
    EMAIL_COMPLAINT_SUBJECT: str = Field(default="complaint", description="Exact subject (case-insensitive) that marks a complaint")
    EMAIL_MAX_SEND_ATTEMPTS: int = Field(default=5, description="Outbound mail retries before a notification is marked failed")

    # Ollama Local Fallback Configuration
    ENABLE_OLLAMA: bool = Field(default=False, description="Enable local Ollama fallback if Groq is unconfigured")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Ollama server base URL")
    OLLAMA_MODEL: str = Field(default="llama3", description="Model name served by Ollama")
    OLLAMA_TIMEOUT_SECONDS: float = Field(default=30.0, description="Request timeout in seconds")

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
