-- Migration 002: Expand tickets status and priority check constraints to support the complete AI helpdesk lifecycle
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;

ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (
    status::text = ANY (ARRAY[
        'Open', 'RECEIVED', 'Received',
        'AI_PENDING', 'Ai_Pending',
        'TRIAGED', 'Triaged',
        'QUEUED', 'Queued',
        'NEEDS_HUMAN_REVIEW', 'Needs Human Review',
        'ASSIGNED', 'Assigned',
        'IN_PROGRESS', 'In Progress',
        'RESOLUTION_SUBMITTED', 'Resolution Submitted',
        'USER_VERIFICATION', 'User Verification', 'Awaiting Verification',
        'RESOLVED', 'Resolved',
        'REWORK_REQUESTED', 'Rework Requested', 'Re-evaluation',
        'CLOSED', 'Closed',
        'CANCELLED', 'Cancelled'
    ]::text[])
);

ALTER TABLE public.tickets ADD CONSTRAINT tickets_priority_check CHECK (
    priority IS NULL OR priority::text = ANY (ARRAY[
        'P1', 'P2', 'P3', 'P4',
        'Low', 'Medium', 'High', 'Critical',
        'low', 'medium', 'high', 'critical'
    ]::text[])
);

