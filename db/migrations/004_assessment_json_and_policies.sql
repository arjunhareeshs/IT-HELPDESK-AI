-- Migration 004: persist the full structured assessment and align category policies with the classifier
ALTER TABLE public.ticket_ai_assessments
    ADD COLUMN IF NOT EXISTS assessment_json JSONB;

-- category_policies has no unique key, so guard each seed row explicitly.
INSERT INTO public.category_policies (category, default_priority, sla_resolution_hours, escalation_hours, policy_version)
SELECT v.category, v.default_priority, v.sla_resolution_hours, v.escalation_hours, '1.0'
FROM (VALUES
    ('Database',           'P2',  8, 1),
    ('Inquiry/Help',       'P4', 72, 8),
    ('IT General Support', 'P4', 72, 8)
) AS v(category, default_priority, sla_resolution_hours, escalation_hours)
WHERE NOT EXISTS (
    SELECT 1 FROM public.category_policies p WHERE lower(p.category) = lower(v.category)
);
