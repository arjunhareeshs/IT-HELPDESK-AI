"""
Background Triage Sweeper Worker.

Continuously monitors the PostgreSQL database for tickets in 'AI_PENDING' status.
Ensures that tickets created via Admin, Complainant, Email, or external integrations
are guaranteed to be autotriggered and triaged, even if background tasks were interrupted
or if the server was restarted.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from app.db.session import get_db_session
from app.models.ticket import Ticket

logger = logging.getLogger("helpdesk.triage_sweeper")

SWEEP_GRACE_SECONDS = 90
_sweeper_task: Optional[asyncio.Task] = None
_stop_event = asyncio.Event()


async def sweep_pending_tickets():
    from app.services.triage_service import triage_service

    try:
        with get_db_session() as session:
            pending_ids = session.execute(
                select(Ticket.ticket_id)
                # Grace period: the creating path (web request, email handler) triages the ticket itself right away,
                # sometimes with a different classifier (email -> LLM). The sweeper only rescues tickets left behind.
                .where(Ticket.status == "AI_PENDING", Ticket.created_at < datetime.now(timezone.utc) - timedelta(seconds=SWEEP_GRACE_SECONDS))
                .order_by(Ticket.created_at.asc())
                .limit(10)
            ).scalars().all()
    except Exception as e:
        logger.warning(f"Could not query pending tickets during sweep: {e}")
        return 0

    if not pending_ids:
        return 0

    logger.info(f"Auto-triage sweeper detected {len(pending_ids)} pending ticket(s): {pending_ids}")
    for tid in pending_ids:
        if _stop_event.is_set():
            break
        try:
            logger.info(f"Auto-triggering triage for pending ticket #{tid}...")
            await triage_service.triage_ticket_safe(str(tid))
        except Exception as exc:
            logger.exception(f"Sweeper error triaging ticket #{tid}: {exc}")

    return len(pending_ids)


async def _run_sweeper_loop(poll_interval: int = 20):
    logger.info(f"Background Auto-Triage Sweeper started (polling every {poll_interval}s)...")
    # Initial sweep after a brief startup delay
    await asyncio.sleep(2)
    while not _stop_event.is_set():
        try:
            await sweep_pending_tickets()
        except Exception as e:
            logger.warning(f"Error in triage sweeper loop: {e}")

        try:
            await asyncio.wait_for(_stop_event.wait(), timeout=poll_interval)
        except asyncio.TimeoutError:
            pass


def start_triage_sweeper(poll_interval: int = 20) -> Optional[asyncio.Task]:
    global _sweeper_task, _stop_event
    _stop_event.clear()
    _sweeper_task = asyncio.create_task(_run_sweeper_loop(poll_interval))
    return _sweeper_task


async def stop_triage_sweeper():
    global _sweeper_task, _stop_event
    _stop_event.set()
    if _sweeper_task:
        _sweeper_task.cancel()
        try:
            await _sweeper_task
        except asyncio.CancelledError:
            pass
        _sweeper_task = None
    logger.info("Background Auto-Triage Sweeper stopped.")

