-- Migration 005: expose queue columns to the read-only agent view and backfill queue data
--
-- 1. ai_ticket_search_v gains priority_score and queued_at (appended, so existing columns keep their order).
--    It deliberately has NO complaint text, so the agent's SQL tool cannot read other tickets' content.
CREATE OR REPLACE VIEW public.ai_ticket_search_v AS
SELECT
    t.ticket_id,
    t.category,
    t.priority,
    t.status,
    t.building,
    t.created_at,
    t.college_id,
    t.priority_score,
    t.queued_at
FROM public.tickets t;

-- 2. Backfill queue fields for already-triaged, still-active tickets that predate migration 003.
--    Score uses the same base values as the application (P1=90, P2=70, P3=45, P4=20);
--    queued_at falls back to the ticket's last update (when it was triaged/assigned) or creation time.
UPDATE public.tickets
SET priority_score = CASE upper(priority)
        WHEN 'P1' THEN 90 WHEN 'CRITICAL' THEN 90
        WHEN 'P2' THEN 70 WHEN 'HIGH' THEN 70
        WHEN 'P3' THEN 45 WHEN 'MEDIUM' THEN 45
        WHEN 'P4' THEN 20 WHEN 'LOW' THEN 20
    END
WHERE priority_score IS NULL
  AND priority IS NOT NULL
  AND status IN ('QUEUED', 'ASSIGNED', 'TRIAGED', 'NEEDS_HUMAN_REVIEW', 'REWORK_REQUESTED');

UPDATE public.tickets
SET queued_at = COALESCE(updated_at, created_at)
WHERE queued_at IS NULL
  AND priority_score IS NOT NULL;
