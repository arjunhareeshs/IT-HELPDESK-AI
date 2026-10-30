-- ============================================================================
-- Migration: 001_complete_schema_upgrade.sql
-- Description: Upgrades the IT Helpdesk database schema to support:
--   1. Versioned ML/LLM AI assessments
--   2. Chronological event-based audit trail (expanded ticket_history)
--   3. Ticket attachments with secure object storage keys
--   4. Full technician assignment history & workload tracking
--   5. Separate ticket resolution attempts & verification lifecycle
--   6. Isolated per-ticket case memory for LangChain agent
--   7. Reliable notification outbox
--   8. AI tool call security audit logging
--   9. Operational policy tables (category & priority policies)
--  10. Intelligent routing (technician skills & building assignments)
--  11. Incident registry & ticket links
--  12. Internal & public ticket comments
--  13. Lifecycle timestamp & scope fields on tickets
--  14. High-performance indexes & safe agent search views
-- ============================================================================

-- Step 1: Update existing 'tickets' table with key lifecycle and context columns
ALTER TABLE public.tickets
    ADD COLUMN IF NOT EXISTS college_id VARCHAR(50) DEFAULT 'main-campus',
    ADD COLUMN IF NOT EXISTS affected_service VARCHAR(100),
    ADD COLUMN IF NOT EXISTS re_evaluation_reason TEXT,
    ADD COLUMN IF NOT EXISTS resolution_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_confirmed_at TIMESTAMPTZ;

-- Step 2: Expand existing 'ticket_history' table to be the authoritative event log
ALTER TABLE public.ticket_history
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS actor_type VARCHAR(30) DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS old_value JSONB,
    ADD COLUMN IF NOT EXISTS new_value JSONB;

-- Step 3: Create 'ticket_ai_assessments' (Essential: Versioned ML/LLM runs)
CREATE TABLE IF NOT EXISTS public.ticket_ai_assessments (
    assessment_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    classifier_category VARCHAR(100),
    subcategory VARCHAR(100),
    classification_confidence NUMERIC(5,4),
    severity VARCHAR(20),
    priority_proposed VARCHAR(20),
    priority_confidence_level VARCHAR(20),
    priority_confidence_score NUMERIC(5,4),
    urgency VARCHAR(30),
    impact_scope VARCHAR(30),
    evidence JSONB DEFAULT '[]'::jsonb,
    missing_information JSONB DEFAULT '[]'::jsonb,
    suggested_fix TEXT,
    requires_human_review BOOLEAN DEFAULT FALSE,
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    status VARCHAR(30) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Step 4: Create 'ticket_attachments' (Essential: Secure object storage reference)
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    uploader_user_id BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
    attachment_type VARCHAR(30) NOT NULL DEFAULT 'complaint', -- 'complaint', 'diagnostic', 'resolution'
    storage_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 5: Create 'ticket_assignments' (Essential: Full assignment history)
CREATE TABLE IF NOT EXISTS public.ticket_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    technician_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    assigned_by_user_id BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    assignment_status VARCHAR(30) NOT NULL DEFAULT 'assigned', -- 'assigned', 'accepted', 'completed', 'reassigned', 'cancelled'
    reassignment_reason TEXT
);

-- Step 6: Create 'ticket_resolution_attempts' (Essential: Separate repair attempts & rework)
CREATE TABLE IF NOT EXISTS public.ticket_resolution_attempts (
    attempt_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    technician_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    diagnosis TEXT,
    action_taken TEXT,
    resolution_summary TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verification_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    rework_reason TEXT
);

-- Step 7: Create 'ticket_case_memory' (Essential: Agent isolated working memory)
CREATE TABLE IF NOT EXISTS public.ticket_case_memory (
    ticket_id BIGINT PRIMARY KEY REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    established_facts JSONB DEFAULT '[]'::jsonb,
    contradictions_detected JSONB DEFAULT '[]'::jsonb,
    missing_facts JSONB DEFAULT '[]'::jsonb,
    evidence_references JSONB DEFAULT '[]'::jsonb,
    schema_version VARCHAR(20) DEFAULT '1.0',
    last_triaged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 8: Create 'notifications_outbox' (Essential: Reliable notification delivery)
CREATE TABLE IF NOT EXISTS public.notifications_outbox (
    event_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    recipient_user_id BIGINT REFERENCES public.users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    last_error TEXT
);

-- Step 9: Create 'ai_tool_call_audit' (Essential: Security & tool trace audit)
CREATE TABLE IF NOT EXISTS public.ai_tool_call_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES public.tickets(ticket_id) ON DELETE SET NULL,
    run_id VARCHAR(100),
    tool_name VARCHAR(100) NOT NULL,
    tool_arguments JSONB,
    result_reference JSONB,
    execution_status VARCHAR(30) NOT NULL, -- 'success', 'error', 'rejected'
    execution_time_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 10: Operational Policy Tables
CREATE TABLE IF NOT EXISTS public.category_policies (
    policy_id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    severity_rules JSONB DEFAULT '{}'::jsonb,
    default_priority VARCHAR(20) NOT NULL DEFAULT 'P3',
    sla_resolution_hours INT DEFAULT 24,
    escalation_hours INT DEFAULT 4,
    policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.priority_policies (
    priority_id BIGSERIAL PRIMARY KEY,
    priority_code VARCHAR(20) NOT NULL UNIQUE, -- 'P1', 'P2', 'P3', 'P4'
    response_target_hours NUMERIC(6,2) NOT NULL,
    resolution_target_hours NUMERIC(6,2) NOT NULL,
    escalation_rules JSONB DEFAULT '{}'::jsonb,
    description TEXT
);

-- Step 11: Intelligent Routing Tables
CREATE TABLE IF NOT EXISTS public.technician_skills (
    skill_id BIGSERIAL PRIMARY KEY,
    technician_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    skill_level VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technician_building_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    technician_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    building VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 12: Incident Tracking & Ticket Incident Links
CREATE TABLE IF NOT EXISTS public.active_incidents (
    incident_id VARCHAR(50) PRIMARY KEY, -- e.g. 'INC-2026-091'
    title VARCHAR(255) NOT NULL,
    service VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    scope TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'high',
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'investigating', 'mitigated', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ticket_incident_links (
    link_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    incident_id VARCHAR(50) NOT NULL REFERENCES public.active_incidents(incident_id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 13: Ticket Comments (Internal notes vs Public updates)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    comment_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    author_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false, -- false = public update visible to user, true = internal technician/admin note
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 14: Seed Default Policies (if empty)
INSERT INTO public.priority_policies (priority_code, response_target_hours, resolution_target_hours, description)
VALUES 
    ('P1', 0.5, 4.0, 'Critical Incident - Campus-wide outage, exam disruption or critical infrastructure failure'),
    ('P2', 2.0, 8.0, 'High Priority - Major service impairment affecting department or lab'),
    ('P3', 4.0, 24.0, 'Medium Priority - Single user or standard equipment failure with workaround'),
    ('P4', 8.0, 72.0, 'Low Priority - Minor bug, non-urgent software install or general inquiry')
ON CONFLICT (priority_code) DO NOTHING;

INSERT INTO public.category_policies (category, default_priority, sla_resolution_hours, escalation_hours, policy_version)
VALUES 
    ('Network', 'P2', 8, 2, '1.0'),
    ('Hardware', 'P3', 24, 4, '1.0'),
    ('Software', 'P3', 24, 4, '1.0'),
    ('Account Access', 'P2', 4, 1, '1.0'),
    ('Audio Visual', 'P3', 12, 2, '1.0')
ON CONFLICT DO NOTHING;

-- Step 15: Create High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_raised_by ON public.tickets(raised_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_created ON public.ticket_history(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_ai_assessments_ticket_created ON public.ticket_ai_assessments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_tech ON public.ticket_assignments(technician_user_id, assignment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_resolution_ticket ON public.ticket_resolution_attempts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications_outbox(delivery_status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_incident_links_ticket ON public.ticket_incident_links(ticket_id);

-- Step 16: Safe Read-Only Views for Agent SQL Tools
CREATE OR REPLACE VIEW public.ai_ticket_search_v AS
SELECT 
    t.ticket_id,
    t.category,
    t.priority,
    t.status,
    t.building,
    t.created_at,
    t.college_id
FROM public.tickets t;

CREATE OR REPLACE VIEW public.ai_resolution_search_v AS
SELECT 
    s.solution_id,
    s.ticket_id,
    s.category,
    s.problem_summary,
    s.resolution,
    s.created_at
FROM public.ticket_solutions s;

