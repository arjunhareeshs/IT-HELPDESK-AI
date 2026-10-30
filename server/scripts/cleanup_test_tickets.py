"""
Remove tickets created by automated test runs (and everything attached to them).

A ticket is considered test data when it was raised by the test complainant (default:
user-anonymous@campus.edu, the account the tests file tickets under). Tickets you want to keep
can be listed with --keep. Dry-run by default; pass --apply to delete.

    python scripts/cleanup_test_tickets.py --keep 1
    python scripts/cleanup_test_tickets.py --keep 1 --apply
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.db.session import get_db_session  # noqa: E402
from app.models import (  # noqa: E402
    AIToolCallAudit, NotificationOutbox, Ticket, TicketAIAssessment, TicketAssignment, TicketAttachment,
    TicketCaseMemory, TicketComment, TicketHistory, TicketIncidentLink, TicketResolutionAttempt, TicketSolution, User,
)

CHILD_MODELS = (
    AIToolCallAudit, TicketHistory, TicketAIAssessment, TicketAttachment, TicketAssignment, TicketResolutionAttempt,
    TicketCaseMemory, NotificationOutbox, TicketComment, TicketIncidentLink, TicketSolution,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", default="user-anonymous@campus.edu", help="complainant account used by the tests")
    parser.add_argument("--keep", type=int, nargs="*", default=[], help="ticket ids to keep")
    parser.add_argument("--apply", action="store_true", help="delete (default is a dry run)")
    args = parser.parse_args()

    with get_db_session() as session:
        user = session.execute(select(User).where(User.email == args.email)).scalar_one_or_none()
        if not user:
            print(f"No user {args.email}; nothing to do.")
            return
        rows = session.execute(
            select(Ticket.ticket_id, Ticket.status, Ticket.description)
            .where(Ticket.raised_by_user_id == user.user_id, Ticket.ticket_id.notin_(args.keep or [0]))
            .order_by(Ticket.ticket_id)
        ).all()
        for tid, status, desc in rows:
            print(f"  #{tid:<4} {status:<18} {desc[:70]}")
        ids = [r[0] for r in rows]
        print(f"\n{len(ids)} ticket(s) raised by {args.email}; keeping {args.keep or 'none'}")
        if not ids:
            return
        if not args.apply:
            print("Dry run only - nothing deleted. Re-run with --apply.")
            return
        for model in CHILD_MODELS:
            n = session.execute(delete(model).where(model.ticket_id.in_(ids))).rowcount
            if n:
                print(f"  deleted {n} row(s) from {model.__tablename__}")
        session.execute(delete(Ticket).where(Ticket.ticket_id.in_(ids)))
        session.commit()
        print("Deleted.")


if __name__ == "__main__":
    main()
