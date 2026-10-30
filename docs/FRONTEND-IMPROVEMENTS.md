# Frontend Improvements — AI-Powered IT Helpdesk Ticket Triage

## 1. Objective

Improve the frontend from a set of role-specific pages into one connected IT support product. Every role must operate on the **same ticket record**, with role-appropriate information and actions. A status update by one role must become visible to the other roles without creating a duplicate ticket.

The central workflow is:

**Report → Classify → Assess severity → Review/assign → Diagnose → Record action → Verify → Close or rework → Learn from the outcome**

The frontend presents AI results and collects human decisions; it must not run ML or LLM inference in the browser. All predictions and status transitions come from the backend API.

---

## 2. Highest-priority improvements

Implement these before adding decorative features:

1. **Shared ticket detail page** used by the administrator, complainant and technician, with fields and actions controlled by role permissions.
2. **Complete ticket lifecycle** with explicit statuses, timestamps, action history, resolution submission, user verification and rework.
3. **Evidence-based AI assessment** showing category, classification confidence, severity, evidence, missing information and human-review state as separate fields.
4. **Connected navigation** so clicking any ticket row, dashboard metric, notification or related-incident link opens the canonical ticket detail route.
5. **Operational states** for loading, empty results, errors, stale data, unavailable inference, incomplete information and permission denial.
6. **Real data only**. Do not present hardcoded numbers, fabricated model confidence, fake historical incidents or placeholder technician scores as live results.
7. **Consistent design system** for tables, forms, badges, buttons, dialogs, file uploads, timelines and empty states.

---

## 3. Role-specific improvements

## 3.1 Administrator

### Overview dashboard

Keep the top-level dashboard minimal. Show only high-value operational metrics:

- Open tickets.
- Critical/high-priority tickets requiring attention.
- Tickets completed in the selected period.
- Tickets overdue or at risk of breaching a configured SLA.

Each metric must be clickable and open the ticket list with the matching filters applied. Include a visible date range and indicate when the metrics were last updated.

Below the metrics, prioritize:

- Critical incident queue.
- Unassigned tickets.
- SLA breaches and approaching deadlines.
- Technician workload and availability.
- Repeated incidents by category, service or building.
- Created-versus-resolved trend over a selectable period.

Do not fill the dashboard with many charts that repeat the same information. Charts need meaningful labels, date ranges, tooltips and an accessible tabular alternative.

### Ticket queue

Provide a clearly bounded table with aligned headers, subtle row dividers, consistent row height and useful sorting. Recommended columns:

- Ticket ID.
- Created timestamp.
- Category and subcategory.
- Priority.
- Short issue summary.
- Classification confidence or review state.
- Assigned technician/team.
- Current status.
- SLA state, if configured.

Provide filters for status, priority, category, building, date range, assigned technician and unassigned tickets. Keep filters visible and provide **Clear filters**. Preserve filters and pagination when the user returns from a ticket detail page.

### AI assessment panel

For each ticket, show separate sections for:

- **Classification:** predicted category, subcategory, model confidence and alternate predictions when returned by the API.
- **Severity:** priority/severity label, urgency, affected scope, evidence and missing information.
- **Review state:** accepted, requires human review, corrected by a human or inference failed.
- **Similar tickets:** source ticket ID, similarity score, outcome and verified resolution if available.
- **Recommendation:** suggested next step and its source/evidence.

Do not combine classification confidence, severity and likelihood of resolution into one generic score. A confidence value should only be displayed when the backend defines its meaning. Do not show chain-of-thought; show concise evidence and decision summaries.

Admin actions should include approve/confirm assessment, adjust category or priority with a reason, assign/reassign, request more information, escalate, link to a parent incident and reopen when permitted. Record every important override in an audit history.

### Registry and incidents

Split the registry into useful views:

- Active work.
- Waiting for user or third party.
- Resolved and verified.
- Awaiting verification.
- Reopened/rework.
- Linked or recurring incidents.
- Audit history.

Allow multiple similar complaints to be linked to a parent incident while preserving the original ticket records and each complainant's timeline. Display the source records behind recurring-incident insights.

### Technician management

Show skills by category/subcategory, current availability, active workload, assigned tickets, completed tickets, median resolution time, SLA compliance, user verification outcomes and reopened/rework rate.

If a technician score is introduced, show its components and calculation. Adjust comparisons for ticket type and severity. Do not create an unexplained leaderboard or imply that raw completion counts alone measure technician quality.

When recommending an assignee, explain the factors used (skills, availability, workload, location/on-call requirements and relevant verified experience). The administrator must be able to review or override the recommendation.

### Reports and audit

Provide date filtering and export where authorized. Include category macro-F1, priority precision/recall, calibration, human-review rate, retrieval quality, median first-response time, median verified-resolution time, SLA performance and rework rate when these metrics are supported by real data.

Record the actor, timestamp, previous value, new value and reason for key changes to category, priority, assignment, status and resolution. Restrict access to internal notes and staff-sensitive information.

---

## 3.2 Student / staff complainant

### Home page

Focus on the user's own requests:

- Open tickets and their current status.
- Tickets waiting for the user's response.
- Resolutions waiting for verification.
- Recent updates.
- A clear **Raise a complaint** action.

Do not expose institution-wide ticket lists, internal technician-performance information, model debug data or private staff notes.

### Complaint form

Keep the form short, but collect the context required for triage:

- Short issue title.
- Description of what happened and what was expected.
- Location (building, floor, lab/room or remote).
- Affected service/device, if known.
- Scope of impact (only me, several users, whole room/building or unknown).
- When the issue first occurred, if known.
- Deadline or activity affected, if relevant.
- Screenshot/photo/file attachments.

The system should record the submission timestamp automatically. Do not force users to select a technical category or priority they may not understand; allow the AI to suggest the category, with an editable correction if appropriate.

Show accepted file types, file-size limits, upload progress, retry and remove controls. Do not imply an attachment has been uploaded until the server confirms it.

### Submission assistance

Before submission, offer concise assistance:

- Point out missing details that could help diagnosis.
- Ask one relevant clarifying question when necessary.
- Suggest approved self-help instructions for routine known issues.
- Inform the user if a related outage is already recorded.

Never block a complaint solely because it resembles an existing ticket. Let the user continue and preserve separate ticket records unless a human or defined duplicate policy links them.

### My tickets and tracking

Every ticket detail page should show:

- Ticket ID, created timestamp and current status.
- Public-facing status timeline.
- Assigned team/person only when policy permits disclosure.
- Requests for additional information and a reply form.
- Public progress updates.
- Resolution summary and submitted evidence.
- Verify resolution, partially resolved or request rework controls when available.

Do not expose internal notes, private audit fields or unfiltered LLM output. Use plain language to explain statuses.

### Resolution verification and rework

When a technician submits a fix, ask the complainant to verify the outcome with clear choices:

- **Resolved** — user confirms the service works; complete the ticket if policy allows.
- **Still not working** — request a short description and optional evidence, then create a rework/reopen transition.
- **Partially resolved** — keep the remaining issue recorded and route it for follow-up.

Preserve the original report and all previous technician attempts. A failed fix must not erase prior history or force the user to create an unrelated new complaint.

### Notifications

Notify users about assignment, progress, requests for information, resolution submission, verification reminders and rework updates. Notifications must deep-link to the relevant ticket. Avoid sending multiple notifications for the same event.

---

## 3.3 Technician

### Work queue

The landing page should show assigned work ordered by priority, SLA risk and assignment time. Include filters for status, category, due state and location. Show active workload and availability, but keep the queue focused on actions rather than decorative metrics.

Ticket cards/rows should show ticket ID, priority, issue summary, location, age/SLA state, status and latest update. Opening an item should lead to the same canonical ticket detail route used elsewhere.

### Ticket workspace

Provide a compact work area with:

- Original complaint and attachments.
- User-provided impact and location.
- Category, severity and evidence-backed AI assessment.
- Similar historical tickets and verified fixes.
- Diagnostic checklist when relevant.
- Technician notes and status controls.
- Blocker/escalation reporting.
- Resolution report and evidence upload.

The technician should be able to acknowledge work, start work, ask the complainant for details, record findings, report a blocker, escalate, submit a resolution, or state that the issue remains unresolved.

Keep diagnostic actions distinct from verified outcomes. Checking a troubleshooting step does not prove that the issue was fixed. Require the technician to record what was done and how the service was tested.

### Resolution report

Require concise fields for:

- Observed cause (or “cause not confirmed”).
- Actions performed.
- Verification/test performed.
- Outcome: resolved, partially resolved or not resolved.
- Remaining risks/blockers.
- Attachments/evidence where relevant.

Do not allow the technician's report to silently close the user-side verification loop. Use the configured resolution and verification policy.

### Technician history and knowledge

Let technicians review previous tickets, their reports and related verified resolutions. They can reuse approved knowledge-base steps but should not be able to change historical records without an auditable correction.

Keep performance insights private to authorized users. Show useful personal measures with context rather than a simplistic public ranking.

---

## 4. Shared ticket lifecycle and state model

Use a defined set of status values from the backend, for example:

- `submitted`
- `triaging`
- `needs_review`
- `queued`
- `assigned`
- `in_progress`
- `waiting_for_user`
- `blocked`
- `awaiting_verification`
- `rework_requested`
- `resolved`
- `closed`
- `rejected` (only if supported by policy)

Agree on the actual enum values with the backend before implementation. Do not create independent status strings in each React component.

Build a state-transition map that defines:

- Which role may perform each transition.
- Valid previous and next states.
- Whether a reason/comment is required.
- Whether a notification should be sent.
- Whether the transition affects SLA timers.
- Whether an audit event must be recorded.

The frontend should hide or disable actions that the current role cannot perform, but the backend remains the authority for permission checks and valid transitions.

Every state update must refresh or invalidate affected ticket data, queue counts, dashboard metrics, the public timeline and notification badges. Do not locally change one page while leaving the rest of the application stale.

---

## 5. Navigation and cross-page connections

All connected elements must perform a real navigation or action:

- Metric card → ticket list with appropriate filters.
- Table row → canonical ticket detail page.
- Notification → related ticket/event.
- Similar ticket → historical ticket detail.
- Parent incident → related ticket group.
- Technician recommendation → technician profile/workload, with assignment action where permitted.
- Building/service insight → filtered incident list.
- Resolution reference → source ticket or knowledge-base article.
- Breadcrumb → previous page or parent section.

Use URL routes for important page state, such as ticket ID and list filters, so pages can be refreshed, bookmarked and shared where permissions allow. Avoid nonfunctional buttons and clickable-looking text without an action.

Suggested route structure:

```text
/login
/admin/overview
/admin/tickets
/admin/tickets/:ticketId
/admin/registry
/admin/incidents/:incidentId
/admin/technicians
/admin/technicians/:technicianId
/admin/ai-insights
/admin/reports
/admin/audit
/portal/home
/portal/complaints/new
/portal/tickets
/portal/tickets/:ticketId
/technician/queue
/technician/tickets/:ticketId
/technician/history
/technician/knowledge-base
/technician/profile
```

Route names can change to match the project's conventions, but do not create separate copies of ticket detail for each role. Use role-based rendering and permission checks around the shared detail view.

---

## 6. Design system improvements

Use the established palette consistently:

| Token | Hex | Usage |
|---|---|---|
| Ink | `#1A1423` | Main dark text, dark navigation and high-contrast elements |
| Plum | `#372549` | Secondary dark surface and active navigation |
| Mauve | `#774C60` | Secondary actions and subtle emphasis |
| Rose | `#B75D69` | Primary actions and selected states, used sparingly |
| Blush | `#EACDC2` | Soft highlights and low-emphasis surfaces |

Use neutral page backgrounds, white/pale panels and clear grey borders. Keep Calibri as the primary font with fallback fonts only when unavailable. Do not use excessive gradients, glow effects, glassmorphism, oversized headings or many different corner radii.

Create reusable design tokens for:

- Typography sizes and weights.
- Spacing scale.
- Page and panel backgrounds.
- Border and focus colours.
- Radius and shadows.
- Status and priority colours.
- Table row/header styles.
- Button sizes and variants.
- Form field heights and error states.

Use consistent status badges with both colour and text. Priority must remain understandable to users with colour-vision deficiencies. Avoid using red for ordinary decoration; reserve it for meaningful danger or urgency states.

Keep the login page closely aligned with the supplied reference image. Treat the reference as visual direction for composition, spacing, split layout and illustration—not a reason to copy inaccessible tiny text or make the form difficult to use. Keep the authenticated application visually consistent with the same palette, typography and restrained styling.

---

## 7. Tables, forms and detail pages

### Tables

- Use fixed or carefully controlled column widths where appropriate.
- Keep headers aligned with their columns.
- Use clear row borders and subtle hover states.
- Support sorting only on meaningful fields.
- Include pagination or virtualization when data volume requires it.
- Preserve filters, sort order and page position on navigation when practical.
- Provide loading skeletons, an empty state and a recoverable error state.
- Keep row actions discoverable and accessible by keyboard.
- On smaller screens, switch to a compact responsive layout rather than squeezing every column.

### Forms

- Use visible labels, concise helper text only where necessary, and field-level errors.
- Validate on submission and use inline feedback when useful.
- Preserve entered content after recoverable errors.
- Indicate required and optional fields accurately.
- Prevent duplicate submissions while a request is in progress.
- Show submission success only after the backend confirms it.
- Confirm before destructive actions and explain the consequences.

### Ticket detail

Use a consistent information hierarchy: summary/header, current status and actions, complaint/evidence, AI assessment, activity timeline, assignment, technician report and related incidents. Use tabs or collapsible panels only when they reduce clutter; do not hide important urgent information behind multiple clicks.

---

## 8. React, state and component architecture

Use React, TypeScript, Vite, Node.js tooling and ESLint. Keep components small and responsibility-focused.

Suggested client structure:

```text
client/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── tables/
│   │   ├── forms/
│   │   ├── tickets/
│   │   ├── ai-assessment/
│   │   ├── timeline/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── complainant/
│   │   ├── technician/
│   │   ├── tickets/
│   │   ├── incidents/
│   │   └── notifications/
│   ├── hooks/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── query-client.ts
│   │   ├── permissions.ts
│   │   └── utils.ts
│   ├── schemas/
│   ├── types/
│   ├── styles/
│   └── main.tsx
├── .env.example
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

Use a shared API client and typed request/response schemas. Keep backend response types in one place. Do not spread direct `fetch` calls across page components.

Recommended packages (choose compatible current stable versions when setting up the project):

- `react`, `react-dom`, `react-router-dom`
- `typescript`, `vite`
- `eslint` and compatible TypeScript/React ESLint plugins
- `@tanstack/react-query` for server-state fetching, caching and invalidation
- `react-hook-form` and `zod` for forms and client-side validation
- `lucide-react` for consistent icons
- A lightweight chart library only if meaningful reports are required
- `vitest` and React Testing Library for tests
- `playwright` for key end-to-end workflows

Use React state for local UI state (open dialog, active tab, unsaved input). Use server state for tickets, metrics, notifications and assignments. Use `useEffect` only for genuine side effects such as subscriptions, event listeners or synchronization with external systems—not as a substitute for event handlers or a data-fetching architecture. Clean up subscriptions/listeners on unmount and handle stale responses or cancellation.

Use composition for reusable layout and role-specific panels. Avoid one enormous component with nested role conditions. Avoid duplicating the entire ticket detail page for each role; compose shared ticket information with role-specific actions.

---

## 9. API integration requirements

Agree on the API contract with the backend. Likely endpoint groups include:

- Authentication/session and current-user role.
- Ticket create/list/detail/update.
- AI triage status and assessment.
- Assignment and escalation.
- Ticket comments and requests for information.
- Attachments upload/download.
- Technician queue, availability and profile.
- Resolution submission and user verification/rework.
- Notifications.
- Incidents and related-ticket links.
- Dashboard metrics, reports and audit history.

Frontend requirements:

- Use `VITE_API_BASE_URL` for the API base URL; never embed secrets in frontend environment variables.
- Keep authentication token/session handling aligned with backend security design.
- Handle `401`, `403`, `404`, `409`, `422`, `429` and `5xx` responses appropriately.
- Represent AI processing as an explicit state such as queued, running, completed, review required or failed.
- Provide retry only when it is safe; do not silently create duplicate tickets during retries.
- Invalidate/refetch related query data after state-changing mutations.
- Use polling, Server-Sent Events or WebSockets only when needed for live updates; unsubscribe or stop polling when no longer needed.
- Do not expose server stack traces or raw internal model output to users.

---

## 10. Loading, empty, error and edge states

Every meaningful page must cover these conditions:

- Initial loading.
- Empty dataset or no matching filters.
- API request failed.
- Session expired.
- Access denied.
- Ticket deleted or unavailable.
- AI service unavailable or timed out.
- AI output invalid or requiring human review.
- Attachment still uploading, upload failed or file rejected.
- Conflicting status transition (for example, another user updated the ticket first).
- Duplicate submission attempt.
- No technician currently available.
- Resolution awaiting user verification.
- User requests rework after a proposed resolution.

Use concise messages with a next action. Example: “Could not load tickets. Retry.” Avoid blank screens, endless spinners and fake success messages.

---

## 11. Accessibility, responsiveness and security

- Ensure every control works by keyboard and has a visible focus state.
- Associate every field with a label; do not rely on placeholder text as the only label.
- Use accessible names for icon-only buttons.
- Meet readable colour-contrast requirements; never communicate priority by colour alone.
- Announce important asynchronous status changes to assistive technology where appropriate.
- Support zoom and responsive layouts for desktop, tablet and mobile.
- Avoid horizontal scrolling for primary forms; make complex tables adapt on smaller screens.
- Validate file types and sizes on the client for usability and on the backend for security.
- Treat uploaded files and user complaint text as untrusted input.
- Do not rely on hidden frontend buttons for authorization; the backend must enforce permissions.
- Do not show another user's ticket, private notes or restricted technician data.
- Do not put secrets in `VITE_*` variables; Vite exposes these values to client code.

---

## 12. Testing and acceptance criteria

### Functional tests

- Each role can access only its authorized routes and actions.
- Submitting a complaint creates exactly one ticket and returns a ticket ID.
- Clicking a ticket from any list opens the same canonical detail route.
- An ML category result and LLM severity assessment render as separate fields.
- Failed or uncertain inference is visibly marked and does not silently default to low severity.
- An administrator's assignment or priority change updates the ticket's shared state.
- A technician can submit notes, action details and evidence.
- A complainant can verify success or request rework.
- Rework preserves the previous report and ticket history.
- Dashboard metrics and filtered ticket lists use backend results.
- API failure, permission failure and stale/conflicting updates have understandable feedback.

### Visual and quality checks

- Run ESLint and TypeScript checks without errors.
- Test common pages at desktop and mobile widths.
- Check keyboard navigation and focus states.
- Verify contrast and accessible labels.
- Remove unused components, placeholder text, dead links and nonfunctional buttons.
- Ensure the UI does not claim AI analysis or successful actions before the backend returns confirmation.

### End-to-end demo scenario

1. A student reports a network issue and attaches a screenshot.
2. The system creates a ticket and returns its ID.
3. The classifier returns a category and confidence; the severity service returns a structured assessment or a review-required state.
4. The administrator sees the ticket and reviews the evidence.
5. The administrator assigns a suitable technician.
6. The technician acknowledges the task, records diagnostic actions and submits a resolution with evidence.
7. The complainant receives the update and verifies the fix—or requests rework.
8. All three views show the same state and timestamped history.
9. The audit history records important actions and the reports reflect the final outcome.

---

## 13. Implementation order

### Phase 1 — Foundation

- React/TypeScript/Vite project, routing, ESLint and design tokens.
- Authentication/session and role-based navigation.
- Shared API client, typed schemas and reusable UI components.
- Ticket list and canonical ticket detail route.

### Phase 2 — Complete workflow

- Complaint form and attachment upload.
- AI assessment panel and human-review state.
- Admin assignment and priority correction.
- Technician queue and resolution report.
- User tracking, verification and rework.
- Shared timeline, audit events and notifications.

### Phase 3 — Operational intelligence

- SLA timers and escalation views.
- Related/parent incident experience.
- Historical resolution retrieval UI.
- Technician workload insights.
- Reports, AI quality evaluation and feedback loop.

### Phase 4 — Polish

- Responsive table behavior and mobile layouts.
- Accessibility audit.
- Loading/error/empty state consistency.
- Visual refinement against the provided login and palette references.
- Unit, integration and end-to-end tests.

---

## 14. Final frontend standard

The finished product should feel like a coherent institutional support tool, not a set of disconnected AI-generated screens. Use concise labels, a restrained plum/rose palette, Calibri typography, clear table boundaries and purposeful interactions.

Every major element must either communicate real status, help a person make a decision, capture evidence, or move a ticket toward resolution. Remove any element that does none of those things.
