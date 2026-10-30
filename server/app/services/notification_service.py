"""
Notification Service.
Implements the outbox pattern for technician notifications and complainant status timeline updates.
Durable delivery records live in the `notifications_outbox` table (written transactionally with the
assignment). This in-process list is only a read-side trace of events queued during the current run;
nothing here is ever marked delivered until a real delivery worker confirms it.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone


class NotificationService:
    def __init__(self):
        self._outbox: List[Dict[str, Any]] = []

    def queue_assignment_notification(
        self,
        ticket_id: str,
        technician_id: str,
        priority: str,
        category: str,
        service_impact: str
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        event = {
            "event_id": f"notif-{ticket_id}-{len(self._outbox)+1}",
            "ticket_id": ticket_id,
            "recipient_id": technician_id,
            "type": "TECHNICIAN_DISPATCH",
            "payload": {
                "ticket_id": ticket_id,
                "priority": priority,
                "category": category,
                "summary": service_impact
            },
            "queued_at": now_iso,
            "delivered": False,
            "delivered_at": None,
        }
        self._outbox.append(event)
        return event

    def get_outbox_events(self, ticket_id: str | None = None) -> List[Dict[str, Any]]:
        if ticket_id:
            return [e for e in self._outbox if e["ticket_id"] == ticket_id]
        return self._outbox


notification_service = NotificationService()
