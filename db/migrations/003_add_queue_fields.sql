-- Migration 003: Add queue timestamp and priority score to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS priority_score NUMERIC(5, 2);

CREATE INDEX IF NOT EXISTS idx_tickets_queue_ordering 
ON public.tickets (priority_score DESC, queued_at ASC) 
WHERE status IN ('QUEUED', 'ASSIGNED', 'TRIAGED');

