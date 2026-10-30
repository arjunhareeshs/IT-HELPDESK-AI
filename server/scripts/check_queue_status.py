import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import get_db_session
from sqlalchemy import text


def check_queue():
    with get_db_session() as session:
        # Total tickets
        total = session.execute(text("SELECT COUNT(*) FROM tickets")).scalar()

        # Breakdown by status
        status_counts = session.execute(
            text("SELECT status, COUNT(*) FROM tickets GROUP BY status ORDER BY COUNT(*) DESC")
        ).fetchall()

        # Active queue: tickets not resolved, closed, or cancelled
        active_tickets = session.execute(
            text("""
                SELECT 
                    t.ticket_id, 
                    t.status, 
                    t.priority, 
                    t.priority_score, 
                    t.category, 
                    t.building,
                    t.queued_at,
                    u.full_name as technician_name
                FROM tickets t
                LEFT JOIN users u ON t.assigned_to_user_id = u.user_id
                WHERE t.status NOT IN ('RESOLVED', 'CLOSED', 'Resolved', 'Closed', 'CANCELLED')
                ORDER BY t.priority_score DESC NULLS LAST, t.queued_at ASC NULLS LAST
            """)
        ).fetchall()

        print(f"TOTAL TICKETS IN DATABASE: {total}")
        print("\nBREAKDOWN BY STATUS:")
        for status, cnt in status_counts:
            print(f"  - {status:<24}: {cnt}")

        print(f"\nACTIVE QUEUE (Total: {len(active_tickets)}):")
        if not active_tickets:
            print("  --> THE QUEUE IS EMPTY.")
        else:
            for r in active_tickets:
                print(f"  [Ticket #{r.ticket_id}] Status: {r.status:<12} | Priority: {r.priority or 'N/A':<4} | Score: {str(r.priority_score):<6} | Category: {r.category or 'N/A':<15} | Tech: {r.technician_name or 'Unassigned':<18} | Queued: {r.queued_at}")


if __name__ == "__main__":
    check_queue()
