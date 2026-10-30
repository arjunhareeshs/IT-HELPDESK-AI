import os
from pathlib import Path
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

# Load .env from server dir
server_env = Path(__file__).resolve().parents[2] / ".env"
if server_env.exists():
    load_dotenv(server_env)
else:
    load_dotenv()

raw_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL

# For synchronous psycopg2 driver
if raw_url.startswith("postgresql+asyncpg://"):
    sync_url = raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
elif raw_url.startswith("postgresql://"):
    sync_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    sync_url = raw_url

engine = create_engine(
    sync_url,
    pool_pre_ping=True,
    # Small pool: the hosted session pooler allows few client connections and every new one costs seconds.
    pool_size=5,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=300,
    # Keep idle connections alive; the server was dropping them mid-request ("server closed the connection unexpectedly").
    connect_args={"keepalives": 1, "keepalives_idle": 30, "keepalives_interval": 10, "keepalives_count": 5}
    if sync_url.startswith("postgresql") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding transactional database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """Helper for standalone scripts, background workers, or services."""
    return SessionLocal()


def warm_pool(connections: int = 4) -> None:
    """Open a few pooled connections in parallel at startup; each new one costs seconds on a remote database."""
    from concurrent.futures import ThreadPoolExecutor
    from sqlalchemy import text

    def ping(_: int) -> None:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

    with ThreadPoolExecutor(max_workers=connections) as pool:
        list(pool.map(ping, range(connections)))
