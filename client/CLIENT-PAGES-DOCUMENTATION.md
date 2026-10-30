# Campus IT Helpdesk — Client Application Documentation

**High-level, page-wise documentation of the React client (`/client`).**
Covers: architecture overview, folder structure, routing & role access, every page's complete UI content, user interactions, data/API layer, state transitions, and end-to-end user flows per role.

**Sections at a glance**

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [Routing, Auth & Role Access](#3-routing-auth--role-access)
4. [Shared Layout & Components](#4-shared-layout--components)
5. [Data & API Layer](#5-data--api-layer)
6. [Ticket Status Lifecycle](#6-ticket-status-lifecycle)
7. **Page-wise Documentation**
   - [Page 1 — Login Page](#71-login-page)
   - [Page 2 — Admin Dashboard](#72-admin-dashboard-page)
   - [Page 3 — Admin Incident Registry](#73-admin-incident-registry-page)
   - [Page 4 — Admin Ticket Detail](#74-admin-ticket-detail-page)
   - [Page 5 — Admin Technician Directory](#75-admin-technician-directory-page)
   - [Page 6 — Admin Reports](#76-admin-reports-page)
   - [Page 7 — Complainant: New Complaint](#77-complainant-new-complaint-page)
   - [Page 8 — Complainant: My Complaints](#78-complainant-my-complaints-page)
   - [Page 9 — Complainant: Complaint Detail](#79-complainant-complaint-detail-page)
   - [Page 10 — Technician: Work Queue](#710-technician-work-queue-page)
   - [Page 11 — Technician: Work Order](#711-technician-work-order-page)
   - [Page 12 — Technician: Work History](#712-technician-work-history-page)
8. [End-to-End User Flows](#8-end-to-end-user-flows)
9. [Design System Notes](#9-design-system-notes)

---

## 1. Architecture Overview

The client is a **React (TypeScript) SPA** built with **Vite**, using:

| Concern | Implementation |
|---|---|
| Routing | `react-router-dom` with nested layouts + a role-aware `ProtectedRoute` guard |
| State | React Context (`AuthProvider`) for auth/session; **TanStack Query (React Query)** for all server data & mutations |
| Server access | Thin service modules (`apiClient`, `ticketApi`, `technicianApi`, `dashboardApi`, `triageApi`, `authApi`) — every call tries the real HTTP API first and falls back to an in-browser **mock store** when the API is unreachable (offline/demo mode) |
| UI kit | Local component library in `components/ui` (`Button`, `Table`, `Modal`, `Input`, `Select`, `Textarea`, `Badge`, `Spinner`, `EmptyState`, `Icons`) |
| Shared parts | `components/shared` (`Sidebar`, `AppHeader`, `ProfileMenu`, `PageTitle`, `MetricCard`, `StatusBadge`, `PriorityBadge`, `TicketTimeline`, `AttachmentUpload`) |
| Styling | CSS custom-property design tokens (rose/mauve/plum palette), global styles in `styles/` |
| Icons | `lucide-react` + custom SVG icon wrappers |

**Three role-based workspaces**, each with its own layout shell (sidebar + top header + routed content):

| Role | Workspace | Default landing route |
|---|---|---|
| `admin` | Incident operations & triage control room | `/admin/dashboard` |
| `complainant` | Self-service complaint filing & verification | `/complainant/my-complaints` |
| `technician` | Assigned work queue & field reporting | `/technician/queue` |

---

## 2. Folder Structure

```
client/src/
├── main.tsx / App.tsx              # App bootstrap, providers, router mount
├── routes/                         # AppRouter (all routes), ProtectedRoute (role guard)
├── layouts/                        # AuthLayout, AdminLayout, ComplainantLayout, TechnicianLayout
│
├── features/
│   ├── auth/
│   │   ├── pages/LoginPage.tsx     # Page 1
│   │   ├── components/LoginForm.tsx
│   │   └── authApi.ts
│   ├── admin/pages/                # Pages 2–6
│   │   ├── DashboardPage.tsx
│   │   ├── RegistryPage.tsx
│   │   ├── TicketDetailPage.tsx
│   │   ├── TechniciansPage.tsx
│   │   └── ReportsPage.tsx
│   ├── complainant/pages/          # Pages 7–9
│   │   ├── NewComplaintPage.tsx
│   │   ├── MyComplaintsPage.tsx
│   │   └── ComplaintDetailPage.tsx
│   └── technician/pages/           # Pages 10–12
│       ├── TechnicianQueuePage.tsx
│       ├── TechnicianWorkPage.tsx
│       └── TechnicianHistoryPage.tsx
│
├── components/
│   ├── ui/                         # Primitives: Button, Table, Modal, Input, Select,
│   │                               #   Textarea, Badge, Spinner, EmptyState, Icons
│   └── shared/                     # Sidebar, AppHeader, ProfileMenu, PageTitle,
│                                   #   MetricCard, StatusBadge, PriorityBadge,
│                                   #   TicketTimeline, AttachmentUpload
│
├── hooks/                          # useAuth, useTickets, useTechnicians, useDashboardStats
├── services/                       # apiClient, ticketApi, technicianApi, dashboardApi,
│                                   #   triageApi, authApi, mockData (fallback store)
├── state/                          # AuthProvider, authContext
├── types/                          # auth.ts, ticket.ts, technician.ts, api.ts
├── constants/                      # CAMPUS_BUILDINGS & config constants
├── utils/                          # permissions.ts, format.ts, date.ts
├── styles/                         # Design-token CSS
└── test/                           # Vitest setup + sample tests
```

---

## 3. Routing, Auth & Role Access

### 3.1 Route table (`routes/AppRouter.tsx`)

| Path | Page | Layout | Allowed role |
|---|---|---|---|
| `/` | Smart redirect | — | any: authed → role home, anon → `/login` |
| `/login` | Login Page | AuthLayout (split visual shell) | public |
| `/admin/dashboard` | Incident Operations Dashboard | AdminLayout | admin |
| `/admin/registry` | Incident Registry | AdminLayout | admin |
| `/admin/tickets/:ticketId` | Admin Ticket Detail | AdminLayout | admin |
| `/admin/technicians` | Technician Directory & Dispatch | AdminLayout | admin |
| `/admin/reports` | Operational Performance Reports | AdminLayout | admin |
| `/complainant/new-complaint` | Submit New IT Incident | ComplainantLayout | complainant |
| `/complainant/my-complaints` | My Submitted Complaints | ComplainantLayout | complainant |
| `/complainant/tickets/:ticketId` | Complaint Detail | ComplainantLayout | complainant |
| `/technician/queue` | Assigned Work Queue | TechnicianLayout | technician |
| `/technician/tickets/:ticketId` | Work Order detail | TechnicianLayout | technician |
| `/technician/history` | Personal Work History | TechnicianLayout | technician |
| `*` (catch-all) | Redirect to `/` | — | any |

### 3.2 Route protection (`routes/ProtectedRoute.tsx`)

Evaluation order:
1. **Auth loading** → full-viewport `Spinner` while auth state hydrates.
2. **Not authenticated** → redirect to `/login` (replace).
3. **Role mismatch** (no `user` or `user.role` not in `allowedRoles`) → redirect to the user's own default role home via `getDefaultRouteForRole(user.role)` — an admin can never enter complainant/technician routes and vice versa.
4. Otherwise → render nested `<Outlet />`.

### 3.3 Landing route per role (`utils/permissions.ts`)

| Role | Default route after login |
|---|---|
| admin | `/admin/dashboard` |
| complainant | `/complainant/my-complaints` |
| technician | `/technician/queue` |
| unknown | `/login` |

Helper `isRoleAllowed(userRole, allowedRoles)` used where inline role checks are needed.

---

## 4. Shared Layout & Components

### 4.1 Layout shells

All role layouts share one structure: `.app-shell` → left `Sidebar` + right `.main-layout` (`AppHeader` on top + `<main class="page-content">` with the routed `<Outlet />`).

- **AdminLayout / ComplainantLayout / TechnicianLayout** — structural only (18 lines each); the Sidebar is **role-gated** and changes nav items per role.
- **Sidebar nav items per role:**

| Role | Links | Footer |
|---|---|---|
| admin | Dashboard, Registry, Technicians, Reports | Log out |
| complainant | **My Complaints** (`/complainant/my-complaints`), **Report Issue** (`/complainant/new-complaint`) | Log out |
| technician | **Work Queue** (`/technician/queue`), **History** (`/technician/history`) | Log out |

- **AppHeader**: brand block "Campus IT Helpdesk / Service operations", notifications bell (decorative badge), user avatar + name/role, **Sign out** button. Sidebar footer also exposes a `Log out` button that calls `logout()` from `useAuth`.

### 4.2 Key shared components

| Component | Role in pages |
|---|---|
| `PageTitle` | Standard page heading block (title + subtitle + optional right "action" slot used at `/admin` `/technician` ticket pages for badges). |
| `MetricCard` | Stat tile (label, value, subtext, icon) on Admin Reports & Technician History. |
| `StatusBadge` | Render colored chip for ticket status (Submitted, Triaged, Assigned, In progress, Awaiting verification, Re-evaluation, Resolved, Closed). |
| `PriorityBadge` | Colored chip for AI-assessed severity (`critical/high/medium/low/unknown`). |
| `TicketTimeline` | Vertical timeline renderer fed by `ticket.timeline` entries; used on all three detail pages (admin / complainant / technician). |
| `Table` | Generic `Column<T>` table with `keyExtractor` and optional `onRowClick` (all list pages make rows navigate). |
| `EmptyState` | Standard "nothing here" panel with title/description/optional action button. |
| `Spinner` | Standard loading indicator. |
| `AttachmentUpload` | 5 MB max upload widget, PNG/JPG/WebP/PDF only, thumbnail preview + remove button, used by New Complaint. |
| `Modal` | Used by New Complaint's re-evaluation dialog pattern (modal markup is inline on some pages). |

---

## 5. Data & API Layer

### 5.1 Hooks → services map

| Hook | Query/Mutation | Service call | Cache keys |
|---|---|---|---|
| `useTickets(params)` | query (list) | `ticketApi.getTickets()` | `['tickets', params]` |
| `useTicket(id)` | query (single) | `ticketApi.getTicketById(id)` | `['ticket', id]` |
| `useTechnicians()` | query | `technicianApi.getTechnicians()` | `['technicians']` |
| `useDashboardStats()` | query | `dashboardApi.getStats()` | `['dashboard-stats']` |
| `useCreateComplaint(data, complainant)` | mutation | `POST /tickets` | invalidates tickets / dashboard-stats |
| `useConfirmResolution(ticketId, actor)` | mutation | `POST /tickets/{id}/confirm` | invalidates tickets, ticket, stats |
| `useRequestReEvaluation(ticketId, reason, actor)` | mutation | `POST /tickets/{id}/re-evaluate` | invalidates tickets, ticket, stats |
| `useAssignTechnician(ticketId, technicianId, actor)` | mutation | `POST /tickets/{id}/assign` | invalidates tickets, ticket, stats |
| `useSubmitWorkReport(ticketId, notes, actor)` | mutation | `POST /tickets/{id}/work-report` | invalidates tickets, ticket, stats |

**Actor convention:** every mutation carries a free-text `actor` string that lands in the ticket timeline. Examples: `'Admin Dispatcher'` (Ticket Detail), `'Admin Quick Dispatcher'` (Dashboard quick-assign modal), `user?.name || 'Complainant'`, technician identity.

### 5.2 Offline / demo resilience (`services/ticketApi.ts`)

Every method follows the pattern **try → real HTTP `request()`; catch → mockStore fallback**:

| Method | Real endpoint | Mock fallback behavior |
|---|---|---|
| `getTickets` | `GET /tickets?status=&priority=` (skips `all`) | Filters by complainant/technician id, then status, then severity |
| `getTicketById` | `GET /tickets/{id}` | Throws "Ticket {id} not found" |
| `createComplaint` | `POST /tickets` | Creates ticket in store (building, text, affected_service, complainant) |
| `confirmResolution` | `POST /tickets/{id}/confirm` | Status → **Resolved**, timeline note "Complainant confirmed resolution." |
| `requestReEvaluation` | `POST /tickets/{id}/re-evaluate` `{reason}` | Status → **Re-evaluation** with stored reason |
| `assignTechnician` | `POST /tickets/{id}/assign` `{technician_id}` | Sets technician |
| `submitWorkReport` | `POST /tickets/{id}/work-report` `{action_notes}` | Sets action notes + Awaiting verification |

> Note: `getTickets` forwards only `status`/`priority` to the real API; role/userId/category/search filters are honored only in the mock fallback.

---

## 6. Ticket Status Lifecycle

Full workflow recognized across the UI:

```
complainant
──────────────────────────────────────────────────────────────────────────
[New Complaint] ──▶ ▮ Submitted
                        │  (server-side auto triage; AI severity carries `unknown`
                        │   tickets are "Flagged for Mandatory Human Review")
                        ▼
                    ▮ Triaged / Assigned        ── admin assigns technician
                        ▼
                    ▮ In Progress               ── technician works
                        ▼   (technician submits Work Report ≥15 chars)
        ┌──────────────▶ ▮ Awaiting Verification
        │                    │
        │   "Confirm         ├─ "Confirm Resolved"      ──▶ ▮ Resolved ─▶ ▮ Closed
        │   Resolved"        │
        │                    └─ "Issue Not Fixed" + reason (≥10 chars)
        │                              ──▶ ▮ Re-evaluation ─▶ back to technician work page
        └──────────────────────────────────────── (alert shown, technician re-reports)
```

- Severity scale: `critical | high | medium | low | unknown` (AI classifier output; `critical`+`high` together = "urgent").
- View-only personas cannot set statuses directly; statuses change only through the four mutations above.

---

# 7. Page-wise Documentation

## 7.1 Login Page

**Route:** `/login`  ·  **File:** `features/auth/pages/LoginPage.tsx` + `features/auth/components/LoginForm.tsx`
**Layout:** `AuthLayout` (split-screen brand shell).

### Content
- **Left panel (`login-form-panel`)** — the form side:
  - Brand row: shield mark (`ShieldCheck`) + **"Campus IT Helpdesk"** / "Support service portal".
  - **Signed-in banner** (conditional): if the visitor is already authenticated → green banner "Signed in as **{user.name}**" with a **Continue** button → navigates straight to the role's default route.
  - Intro block: eyebrow **"Welcome back"**, H1 **"Sign in to continue"**, sub-text "Report an issue, follow its progress, or manage campus support work."
  - `<LoginForm />` — credential inputs, submit per `authApi`; on success navigates to `getDefaultRouteForRole(user.role)`.
  - Footer: *"Need help signing in? Contact your campus IT service desk."*
- **Right panel (`login-visual-panel`)** — marketing visual:
  - Decorative gradient orbs; headline **"Every request gets the attention it needs."**
  - 3-step onboarding strip: `01 Tell us what happened` → `02 We route it to the right team` → `03 Track the work through resolution`, each with a check icon.

### Interactions
- Successful login → role default route.
- Already-signed-in users may bypass re-login via **Continue**.
- No role-selection UI — role comes from credentials.

---

## 7.2 Admin Dashboard Page

**Route:** `/admin/dashboard`  ·  **File:** `features/admin/pages/DashboardPage.tsx`
**Title:** **"Incident Operations Dashboard"** — *"Real-time IT monitoring, active queue of 100 campus problems, and AI triage severity."*

### Content

**(a) Four interactive metric cards** (`metrics-grid-colored`, ~285×120px; hierarchy maintained via border/tint — pure white text on all):

| # | Card | Value | Sub-text | Click behavior |
|---|---|---|---|---|
| 1 | **Active Campus Problems** (palette mint/neutral, ticket icon) | `{activeTickets.length} Active` | "Triaged & pending resolution" | Resets all filters → show **all** active problems |
| 2 | **Critical & High Outages** (terracotta rose card, alert icon) | `{criticalCount} Urgent` | "Exam & floor-level disruption" | Filters severity to `urgent` (= critical+high) |
| 3 | **Awaiting Verification** (topaz/gold card, check icon) | `{awaitingVerificationCount} Fixed` | "Ready for complainant confirmation" | Filters status = `awaiting verification` |
| 4 | **Re-evaluation Requests** (blue card, refresh icon) | `{reEvaluationCount} Actionable` | "Complainant requested revisit" | Filters status = `re-evaluation` |

*(Each card has about 34px padding, bold 12–13px labels, ~34px numbers, secondary sub-lines.)*

**(b) "Active Problems Registry" table panel** (left, 3fr) — the live work queue:
- Header bar: `Active Problems Registry ({filtered} of {total})` + **Reset Filters** button when filters active; sub-line "Status and severity indicators displayed side-by-side for each active issue."
- Controls:
  - **Search** input (200px, "Search 100 problems…") — matches `ticket_id`, complaint text, building, predicted category, assigned technician name (case-insensitive).
  - **Severity select** (135px): All / Critical & High / Critical / High / Medium / Low / Unknown.
  - **Status select** (160px): All / Submitted / Triaged / Assigned / In Progress / Awaiting Verification / Re-evaluation.
- Table columns:

| Column | Content |
|---|---|
| Ticket & Time | `ticket_id` (bold terracotta) + `formatTimeAgo(created_at)` |
| Active Problem Description | complaint text **truncated at 55 chars** (full text via tooltip) + sub-line `Location: {building} • {predicted_category}` |
| Assigned Technician | name or **Unassigned** (faint) |
| Severity | `PriorityBadge` |
| Status | `StatusBadge` |
| Action (right) | **Assign** button (person-check icon → Quick Dispatch modal) + **Triage** button (arrow icon → `/admin/tickets/{id}`) |

- Rows are clickable → navigate to admin ticket detail.
- **Pagination footer:** "Showing X–Y of N active issues", Previous / `Page {p} of {totalPages}` / Next. **15 rows per page**.
- Loading → centered spinner; empty → `EmptyState` "No active problems match filters" with a **Clear all filters** action.

**(c) Right column (1.1fr) — two cards:**
- **Severity Breakdown** card — 5 clickable rows (dot + label + count), each applying its severity filter:
  `Critical Outages` (dark red) / `High Priority` (red) / `Medium Disruption` (amber) / `Low / Routine` (indigo) / `Needs Human Review` (gray). Selected level gets highlighted background.
- **Campus Location Load** card — per-building activity bars scaled out of 15, terracotta fill; rows: Science Block, Examination Complex, Engineering Hall, Library West, Tech Hub A.

**(d) Quick Dispatch modal** (opened per row via **Assign**; backdrop-blur overlay):
- Header: shield icon + **"Quick Dispatch Technician"**, close X.
- Ticket summary box: `{ticket_id} • {building}`, full complaint text, PriorityBadge + StatusBadge.
- Body: select *"— Choose Technician —"* listing `{name} — {department} ({n} active)`.
- Actions: **Cancel** / **Confirm Assignment** (primary; disabled until a tech chosen; shows "Assigning…" while pending).
- Success path: green confirmation "Assigned {id} successfully!" → modal auto-closes after 1.2 s via mutation `useAssignTechnician(actor: 'Admin Quick Dispatcher')`.

### Behavioral notes
- `activeTickets` = everything except `Resolved`/`Closed`.
- Counts (`critical`, `awaiting verification`, `re-evaluation`) computed live from the list.
- All filtering/search/sorting is client-side.

---

## 7.3 Admin Incident Registry Page

**Route:** `/admin/registry`  ·  **File:** `features/admin/pages/RegistryPage.tsx`
**Title:** **"Incident Registry"** — *"Complete institutional registry of ongoing, awaiting verification, and resolved IT work."*

### Content
- **Filter bar:**
  - Status pill tabs: **All Work** / **Ongoing** (≠ Resolved/Closed) / **Awaiting Verification** / **Re-evaluation** / **Resolved / Closed**; active pill has a light rose background (`--color-rose-light`) and terracotta border/text.
  - **Search** input (placeholder *"Search registry…"* — matches ticket id, complaint text, building, complainant name, category).
  - **Priority select** (130px): All / Critical / High / Medium / Low / Unknown.
- **Incident table** columns: `Ticket ID` (plum bold) · `Created` · `Complainant & Building` (two-line: name over building) · `Category` (two-line: category over subcategory or `—`) · `Priority` badge · `Status` badge · `Assigned Tech` (or *Unassigned* faint) · `Latest Note` (action notes truncated at 30) · **View** action (arrow-up-right icon).
- Row click / View → `/admin/tickets/{ticket_id}`.
- Loading → spinner; empty → `EmptyState` "No registry entries / No incidents match the selected filter criteria."
- No pagination (full filtered list), no mutations (read-only page).

---

## 7.4 Admin Ticket Detail Page

**Route:** `/admin/tickets/:ticketId`  ·  **File:** `features/admin/pages/TicketDetailPage.tsx`
**Title (dynamic):** **"Ticket {id}"** — *"Submitted by {complainant_name} on {date}."*
**Header action slot:** `PriorityBadge` + `StatusBadge` side by side. Tagline row includes back **button handling (see below)**.
**Purpose:** dispatcher's inspection + assignment workbench.

### Content — top bar
- **Back** button (`ArrowLeft`, secondary sm) → `navigate(-1)`.

### Content — left column (2fr)

**Panel 1 — "Complainant Incident Details"**
- Eyebrow label **"RAW COMPLAINT TEXT"** (muted 12px uppercase), complaint text pre-wrap on subtle surface.
- Two meta fields: **Location / Building**, **Complainant Name**.

**Panel 2 — "AI Triage & Severity Evidence"** (4px rose left border, `Cpu` icon header)
- Classifier result grid (3 columns on subtle center surface):
  - **Predicted Category** (plum) · **Subcategory** (or `—`) · **ML Confidence (Calibrated)** as formatted percentage.
- LLM evidence stack:
  - **REASONING SUMMARY (LLM Qualitative Assessment)** → `reasoning_summary` (fallback "No reasoning summary provided.")
  - **SERVICE IMPACT** → `service_impact` (conditional)
  - **SUPPORTING EVIDENCE FROM INPUT** → bulleted list over `evidence[]` (conditional)
  - **SAFE NON-EXECUTING RECOMMENDATION** → highlighted muted box with `recommended_next_step`
- **Human-review flag**: when `requires_human_review` is true → critical-red banner with `ShieldAlert` icon + **"Flagged for Mandatory Human Review"**.

**Panel 3 — "Technician Work Report"** (conditional when `action_notes` exists)
- Report text pre-wrap; if `resolution_confirmed_at` present → green footnote **"✓ Resolution confirmed by complainant on {date}"**.

### Content — right column (1fr)

**Panel A — "Assign Technician"** (dispatch card)
- **Currently Assigned:** name or **Unassigned**.
- Select, default option *"Select Technician…"*; options `{name} ({department} - {workload_status})`.
- Primary full-width **"Assign / Reassign"** button (person-check icon); disabled until a tech is chosen or while pending.
- Success toast: "Technician successfully assigned." (auto-clears after 3 s) via `useAssignTechnician(actor: 'Admin Dispatcher')`.

**Panel B — "Status Timeline"** — full `TicketTimeline` of `ticket.timeline`.

### States
- Loading → full-page spinner; error/missing → **Back** (→ `/admin/dashboard`) + `EmptyState "Ticket Not Found / Ticket ID {id} could not be located."`

---

## 7.5 Admin Technician Directory Page

**Route:** `/admin/technicians`  ·  **File:** `features/admin/pages/TechniciansPage.tsx`
**Title:** **"Technician Directory & Dispatch"** — *"Operational workload, category expertise, and assignment status."*

### Content
- **Availability filter tabs** (pills, rose accent when active):
  - **All Technicians** · **Available Now** (`is_available === true`) · **Engaged / On Call** (`is_available === false`)
- **Card grid** (`repeat(auto-fill, minmax(320px, 1fr))`) — each card:
  - Header: technician **name** (16px) over **department**; availability chip at right — green `CheckCircle2` **"Available"** or muted `XCircle` **"Busy"**.
  - Workload stats strip (3 columns on muted surface): **Active** count (plum) · **Resolved** count (ink) · **On-Time %** (terracotta).
  - **EXPERTISE DOMAINS** section: wrap-flex pills for each `supported_categories` entry.
- Loading → spinner; empty → `EmptyState "No Technicians Found / No technicians match the filter."`
- Read-only: cards are not clickable; no diagnostics or editing here.

---

## 7.6 Admin Reports Page

**Route:** `/admin/reports`  ·  **File:** `features/admin/pages/ReportsPage.tsx`
**Title:** **"Operational Performance Reports"** — *"SLA compliance, resolution turnaround metrics, and category trends."*
⚠️ **Currently a static analytics mock** — all numbers are hardcoded; no API wiring, filters, or navigation.

### Content
- **Metric row** (4 × `MetricCard`):
  `Average Response Time — 18 mins` / `Average Resolution Time — 2.4 hrs` / `SLA Compliance Rate — 96.2%` / `Re-evaluation Rate — 3.1%`
- **Two panels:**
  - **"Incidents by Category (Last 30 Days)"** — horizontal bar list (6px terracotta bars scaled by %): Network Infrastructure 142 (42%) · Software & Application License 86 (26%) · Hardware & Workstation Faults 54 (16%) · Account Access & Identity 32 (10%) · Classroom AV & Peripherals 20 (6%).
  - **"Triage Policy & Escalation Distribution"** — muted chips + colored counts:
    Critical Outages (Exam/Campus Block) 4 · High Priority (Department Floor Disruption) 18 · Medium Priority (Single Office Disruption) 76 · Low Priority (Routine Tool Installation) 124 · Human Review Triggered (Vague/Sparse Data) 12.

---

## 7.7 Complainant: New Complaint Page

**Route:** `/complainant/new-complaint`  ·  **File:** `features/complainant/pages/NewComplaintPage.tsx`
**Title:** **"Submit New IT Incident"** — *"Report hardware, network, or software issues on campus. Priority is evaluated automatically."*

### Content — form (centered, max-width 680px)

| Field | Type | Options / placeholder | Validation |
|---|---|---|---|
| **Campus Location / Building** | Select (required) | Science Block *(default)* · Examination Complex · Engineering Hall · Library West · Student Center · Administrative Tower (`CAMPUS_BUILDINGS`) | always valid (pre-filled) |
| **Problem Description** | Textarea (required, 5 rows) | *"Describe the issue, specific room, equipment number, and operational impact…"* | trimmed ≥ **10 chars** else *"Please provide a specific description of the IT issue (at least 10 characters)."* |
| **Affected Service** (Optional) | Select | *(empty)* "I do not know / Not sure" · Campus WiFi / Local Network · Lab Computer / Workstation · Projector / Classroom AV · Printing & Scan Stations · Student Portal / Software | optional (sent as `undefined` when empty) |
| **Attachment** | `AttachmentUpload` | optional screenshot/document | 5 MB; PNG, JPG, WebP, PDF; thumbnail preview + remove |

- Error state: red banner above buttons — *"Failed to submit incident ticket. Please check your connection."*
- Buttons (bottom-right): **Cancel** (secondary → history back) · **Submit Complaint** (primary, loading-aware).

**Helper text under the form** (in the same panel): guidance to trigger **AI triage** cues (e.g., "Every description should answer: What does the user need? What action should the assigned technician take at the scene?").

### Success screen (replaces the form after submission)
- Green `CheckCircle2` icon + H1 **"Complaint Successfully Registered"**.
- Text: *"Your ticket has entered automated triage and priority assessment."*
- Box **"Your Ticket Reference"** — large-rendered `ticket_id` (plum).
- Buttons: **Submit Another** (secondary → blank reset form) · **View My Complaints** (primary → `/complainant/my-complaints`).

**Payload:** `{ building, complaint_text, affected_service, attachment, complainant: { id: user?.id || 'anonymous', name: user?.name || 'Complainant' } }` via `useCreateComplaint`.

---

## 7.8 Complainant: My Complaints Page

**Route:** `/complainant/my-complaints`  ·  **File:** `features/complainant/pages/MyComplaintsPage.tsx`
**Title:** **"My Submitted Complaints"** — *"Track status, technician updates, and verify work resolutions."*

### Content
- Header right action: **New Complaint** button (`PlusCircle`) → `/complainant/new-complaint`.
- Data: `useTickets({ role: 'complainant', userId: user?.id })` (scoped to current user; mock fallback filters by `complainant_id`).
- **Table** (rows clickable → `/complainant/tickets/{ticket_id}`):

| Column | Content |
|---|---|
| Ticket ID | `ticket_id` bold plum |
| Submitted | timestamp |
| Location | building |
| Problem Summary | complaint text truncated to **50 chars** |
| Assessed Priority | `PriorityBadge` |
| Current Status | `StatusBadge` |
| Action | **View Progress** button (arrow icon) |

- Empty state: **"No complaints filed"** — *"You have not submitted any IT incident complaints yet."* + **Submit Your First Complaint** button.
- Loading → spinner. No filters/search/pagination; read-only.

---

## 7.9 Complainant: Complaint Detail Page

**Route:** `/complainant/tickets/:ticketId`  ·  **File:** `features/complainant/pages/ComplaintDetailPage.tsx`
**Title (dynamic):** **"Complaint Reference: {ticket_id}"** — *"Logged on {date}."*
**Header action slot:** PriorityBadge + StatusBadge.

### Content — top bar
- **Back to Complaints** (secondary sm) → `/complainant/my-complaints`.

### Action banner (conditional: `status === 'Awaiting verification'`)
Rose-bordered panel — **"Action Required: Verify Resolution"**
- Body: *"The assigned technician has reported work completed. Please verify if the issue has been resolved to your satisfaction."*
- Buttons:
  - **Issue Not Fixed** (danger, sm; opens re-evaluation modal)
  - **Confirm Resolved** (primary, sm) → `useConfirmResolution(actor: user.name)` → status becomes **Resolved**.

### Left column (2fr)
1. **"Your Complaint"** panel — full complaint text (pre-wrap on subtle surface); meta fields **Location** (building, bold) and **Identified Category** (predicted sway category, plum bold).
2. **"Technician Action Report"** panel (conditional when `action_notes` exists, mauve left border) — report body + footer *"Submitted by {assigned_technician_name}"*.
3. **"Re-evaluation Underway"** panel (conditional: status `Re-evaluation` **and** `re_evaluation_reason`) — red accent heading; body: quoted *"Reason stated: \"{reason}\""*.

### Right column (1fr)
- **"Ticket Timeline"** — `TicketTimeline` of complete lifecycle history.

### Re-evaluation modal — "Request Re-Evaluation"
- Intro: *"Please describe why the issue remains unresolved so the technician can address the remaining problem."*
- Field: **Explanation of Remaining Issue** (Textarea, 4 rows, required) — placeholder *"E.g., The switch was powered on, but port 12 still has no signal…"*
- Validation: ≥ **10 chars**, else red banner *"Please provide a specific explanation of why the issue is not fixed (at least 10 characters)."*
- Buttons: **Cancel** / **Submit Re-evaluation Request** (danger; loading-aware).
- On success → status **Re-evaluation**; reason stored (`useRequestReEvaluation`); modal closes.

### States
- Loading → spinner; error → Back button + `EmptyState "Complaint Not Found / The requested complaint could not be found."`

---

## 7.10 Technician: Work Queue Page

**Route:** `/technician/queue`  ·  **File:** `features/technician/pages/TechnicianQueuePage.tsx`
**Title:** **"Assigned Work Queue"** — *"Active work orders assigned to you, organized by incident severity."*

### Content
- Data: `useTickets({ role: 'technician', userId: user?.id })`; client-side excludes `Resolved`/`Closed`, filters by status tab, sorts by severity weight (`critical 4 > high 3 > medium 2 > low 1 > unknown 0`).
- **Status filter tabs** (pill buttons; active tab rose border/highlight):

| Tab | Label |
|---|---|
| `all` | All Active |
| `in progress` | In Progress |
| `awaiting verification` | Awaiting Verification |
| `re-evaluation` | Re-evaluation |

- **Table columns:** Ticket ID (plum bold) · Age (`formatTimeAgo`) · Category / Location (two-line: `predicted_category` over `building`) · Problem Summary (complaint **truncated at 48 chars**) · Assessed Priority (`PriorityBadge`) · Status (`StatusBadge`) · **Work Ticket** action (wrench icon → `/technician/tickets/{id}`).
- Row click → Work Ticket page.
- Empty: **"Queue Empty"** — *"You have no active work orders pending action in this category."* Loading → spinner. No pagination.

---

## 7.11 Technician: Work Order Page

**Route:** `/technician/tickets/:ticketId`  ·  **File:** `features/technician/pages/TechnicianWorkPage.tsx`
**Title (dynamic):** **"Work Order: {ticket_id}"** — *"Logged on {date} • Location: {building}"*
**Header action slot:** PriorityBadge + StatusBadge.

### Content — top bar
- **Back to Work Queue** (`ArrowLeft`) → `/technician/queue`.

### Left column (2fr)
1. **"Incident Information"** panel
   - Eyebrow label **"COMPLAINANT REPORT"** — full complaint text.
   - Info grid: **Building / Room** · **Category** (plum) · **Assessed Urgency** (`ticket.urgency || 'Normal'`).
   - Conditional line **"Operational Impact:"** when `service_impact` present.
2. **Re-evaluation alert** (conditional on `status === 'Re-evaluation'`)
   - Red-accent panel, `ShieldAlert` icon, heading **"Complainant Requested Re-evaluation"**, body shows the reason.
3. **"Submit Action Report"** panel (the core form)
   - Instructions: *"Document troubleshooting steps and resolution applied. Submitting moves the ticket to **Awaiting Verification** for complainant sign-off."*
   - Field: **Resolution Notes & Work Summary** — Textarea (5 rows, required), placeholder *"E.g., Replaced faulty power supply unit on rack switch. Tested ping to gateway and confirmed 48 ports online…"*
   - Validation: ≥ **15 chars** else *"Please provide detailed action notes describing the troubleshooting steps and fix applied (at least 15 characters)."*; critical-red error banner for submit failure.
   - Submit button: **Submit Work Report** (primary, `CheckCircle2`; shows spinner while pending; disabled during submit).
   - Success: banner **"Work report submitted. The ticket is now Awaiting Verification from the complainant."** — notes field cleared.

### Right column (1fr)
- **"Ticket Timeline"** — full `TicketTimeline`.

**Transition:** any active status (incl. after a re-evaluation) → **Awaiting verification** on successful report submission.

---

## 7.12 Technician: Work History Page

**Route:** `/technician/history`  ·  **File:** `features/technician/pages/TechnicianHistoryPage.tsx`
**Title:** **"Personal Work History & Performance"** — *"Operational track record of verified incident resolutions and complainant feedback."*

### Content
- Data: same `useTickets({ role:'technician', userId })` list, split client-side into `resolvedTickets` (status Resolved/Closed) and `activeTickets`.
- **3 metric cards:**

| Card | Value | Sub-text |
|---|---|---|
| Active Work Orders | `{activeTickets.length}` live | "Currently assigned in queue" |
| Completed & Verified | `{resolvedTickets.length}` live | "Lifetime confirmed resolutions" |
| On-Time SLA Rate | **94%** (static placeholder) | "Within target resolution windows" |

- **Resolved Work History ({n})** table — caption *"Confirmed incident resolutions signed off by campus users."*
  Columns: Ticket ID (terracotta bold) · Location & Category (building over category) · Problem Summary & Verification (summary truncated at 45 + green `ShieldCheck` line with `action_notes` truncated at 40 when present) · Priority badge · Status badge (Resolved/Closed) · **Resolution Verified At** (`resolution_confirmed_at` or `—`) · **View** action (`/technician/tickets/{id}`).
- Row click → the Work Order page (read-only context for completed tickets).
- Empty: **"No past completed tickets"** — *"Completed tickets with confirmed complainant resolution will appear here."*
- No filters/search/pagination; read-only page.

---

## 8. End-to-End User Flows

### 8.1 Complainant flow
```
Login ──▶ My Complaints (empty) ──▶ New Complaint
      fill: building + description (≥10 chars) + optional service & attachment
      submit ──▶ Success screen (ticket id) ──▶ View My Complaints
      ticket appears as Submitted → Triaged (AI) → …
      status becomes "Awaiting verification":
          Complaint Detail ──▶ [Confirm Resolved]  ──▶ Resolved      ✅
                              [Issue Not Fixed] ──▶ modal (≥10 chars) ──▶ Re-evaluation 🔁
      Re-evaluation ──▶ technician revisits ──▶ Awaiting verification again
```

### 8.2 Admin (dispatcher) flow
```
Login ──▶ Dashboard
   Scan metric cards (Active / Urgent / Awaiting verification / Re-evaluation)
   Use cards + breakdown rows as one-click filters
   For each problem:
       [Assign] ──▶ Quick Dispatch modal ──▶ choose technician ──▶ Confirm  ✅
       [Triage] ──▶ Ticket Detail ──▶ read RAW COMPLAINT + AI evidence
                                        └─▶ Assign / Reassign ──▶ "Technician successfully assigned."
   Registry ──▶ full searchable archive by status/priority ──▶ View ticket
   Technicians page ──▶ roster availability/workload (supports dispatch decisions)
   Reports page ──▶ performance snapshot (static mock)
```

### 8.3 Technician flow
```
Login ──▶ Work Queue (your orders, severity-sorted)
   [Work Ticket] ──▶ Work Order page
       read complainant report + impact + (if any) Re-evaluation alert
       write Resolution Notes (≥15 chars) ──▶ Submit Work Report
       ──▶ status → Awaiting Verification ──▶ complainant verifies
       if complainant rejected ──▶ Re-evaluation alert appears ──▶ fix again ──▶ re-report
   History ──▶ Completed & Verified count + resolved table (proof of sign-off)
```

### 8.4 Full ticket lifecycle swimlane (single incident)
```
Complainant submits ─▶ AI triage (category, severity, confidence, reasoning,
                          recommended step; unknown ⇒ human-review flag)
                      ─▶ Admin assigns technician
                      ─▶ Technician works & reports
                      ─▶ Complainant verifies
                              ├─ approve  ─▶ Resolved ─▶ Closed (historyвид для all parties)
                              └─ reject   ─▶ Re-evaluation ─▶ back to technician
```

---

## 9. Design System Notes

- **Pattern:** every page follows the same skeleton — `PageTitle` → action/filter bar → table or cards → status/empty states. This makes new pages trivial to derive.
- **Palette:** rose/terracotta accents (`--color-terracotta`, `--color-rose`, `--color-rose-light`), plum/ink text tokens, subtle `--surface-*` backgrounds; status + priority colors standardized in badges.
- **Feedback patterns:** centered `Spinner` for loading; `EmptyState` with a corrective action button; success banners (green) and critical banners (red) for mutations; **mutations instantly refresh** lists/pages via React Query cache invalidation (`['tickets']`, `['ticket', id]`, `['dashboard-stats']`).
- **Numeric conventions across pages:** complaint truncation 55 (dashboard) / 50 (complainant list) / 48 (technician queue) / 45 (history); note truncation 30 (registry) / 40 (history); page size 15; validation minimums 10 (complaint/re-eval) and 15 (work report).
- **Known gaps / shortcuts:**
  - Reports page values are hardcoded (no API yet).
  - Technician history SLA "94%" is static.
  - `getTickets` server params support only status/priority; role/user scoping currently relies on the mock store.
  - Header notifications bell is decorative.

---

*Doc generated from source: `client/src` — AppRouter, ProtectedRoute, permissions, all 12 page components, layouts, shared components, hooks (`useTickets`, `useTechnicians`) and services (`ticketApi`).*
