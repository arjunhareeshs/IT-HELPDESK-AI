# IT Helpdesk Triage — Frontend Specification

## 1. Goal

Build a polished, minimal, role-based frontend for the AI-powered IT Helpdesk Ticket Triage system. The UI should feel like a carefully designed institutional support product—not a generic AI dashboard. Avoid unnecessary descriptions, decorative cards, oversized headings, excessive gradients, and filler text.

The application has three roles:

1. **Administrator** — monitors ticket operations, checks AI triage results, manages the registry, and oversees technicians.
2. **Complainant** (student or staff) — creates complaints, tracks progress, reviews the technician's action, verifies resolution, or requests re-evaluation when the issue is not fixed.
3. **Technician** — sees assigned work, updates the ticket, submits resolution notes and evidence images, and reviews past work and performance.

The frontend must be built with **React, TypeScript, Node.js tooling, Vite, and ESLint**. The API/backend is separate. Do not implement model inference in the browser.

## 2. Visual direction

### Design principles

- Minimal and calm, with clear hierarchy and generous whitespace.
- Keep labels short. Use concise page titles and useful table column headings.
- Use clear table boundaries, subtle dividers, predictable row heights, and aligned columns.
- Show priority through a small, consistent status badge plus readable text; never rely on colour alone.
- Use Calibri as the primary font, with sensible fallback fonts only if Calibri is unavailable.
- Keep page layouts consistent between roles while showing each role only its relevant navigation.
- No search bar in the main dashboard header. The header should contain the page context where needed and the user profile control at the right.

### Colour palette

Use the supplied five-colour palette. The first colour is the deepest base colour; the other four are supporting plum, mauve, rose, and warm blush tones.

| Token | Hex | Primary use |
|---|---|---|
| `--color-ink` | `#1A1423` | Main dark text, dark navigation, key controls |
| `--color-plum` | `#372549` | Secondary dark surface, active navigation |
| `--color-mauve` | `#774C60` | Secondary actions, subdued emphasis |
| `--color-rose` | `#B75D69` | Primary action, selected states, important highlights |
| `--color-blush` | `#EACDC2` | Soft highlight surfaces, restrained accents |

Use neutral surfaces as well: white for panels and cards, a very pale lavender/grey page background, and neutral grey borders. Reserve the rose colour for primary actions and meaningful states. Do not make every element colourful.

Suggested tokens:

```css
:root {
  --color-ink: #1A1423;
  --color-plum: #372549;
  --color-mauve: #774C60;
  --color-rose: #B75D69;
  --color-blush: #EACDC2;
  --surface-page: #F7F5F8;
  --surface-panel: #FFFFFF;
  --border-subtle: #E5DFE7;
  --text-primary: #241D2B;
  --text-secondary: #716A76;
  --text-muted: #8A8390;
  --font-family: Calibri, Carlito, sans-serif;
  --radius-panel: 16px;
  --radius-control: 8px;
}
```

### Typography and spacing

- Primary font: `Calibri`, followed by `Carlito`, then `sans-serif`.
- Page title: concise, approximately 24–28px, medium/semi-bold.
- Section title: approximately 16–18px.
- Table and form text: approximately 13–15px, legible and consistent.
- Use a consistent spacing scale based on 4px or 8px increments.
- Do not use tiny helper copy. Include helper text only if it prevents a real error.

## 3. Login experience

Recreate the supplied login reference closely in layout and mood, not by embedding the screenshot as the page.

### Composition

- Fill the viewport with a muted warm gradient derived from the supplied mauve/rose palette.
- Centre one large rounded login panel with a soft, restrained shadow.
- Split the panel into two sections: a light form panel on the left and an illustrated visual panel on the right.
- The left panel contains the product mark/name if available, a short greeting, role-aware sign-in fields, password visibility toggle, a small recovery link, and one prominent sign-in button.
- The right panel contains a supplied or original landscape illustration with rounded corners and a subtle overlay if text is used. Avoid generic stock-photo styling.
- Keep the form short and uncluttered. Do not add long descriptions, marketing paragraphs, unnecessary social sign-in buttons, or dummy links. Include social sign-in only if the backend/auth provider genuinely supports it.
- Provide inline validation and a restrained loading state on submission.
- The role should be returned by authentication or selected through a controlled, explicit role selector if the auth design requires it. Do not trust a user-editable role value for authorization.

### Login fields

- Email or institutional ID (use the field supported by the backend).
- Password with show/hide control.
- Sign in button.
- Forgot password link only when the recovery flow exists.
- A concise form-level error message for invalid credentials or unavailable service.

### Responsive behaviour

- Desktop: two-column split panel as in the reference.
- Tablet: reduce panel width and illustration size while preserving form readability.
- Mobile: show the form first; the illustration may move below the form or be hidden. Do not make the user horizontally scroll.

## 4. Shared authenticated shell

Each authenticated role gets a role-specific layout built from shared components.

### Header

- Left: product logo mark and product name.
- Middle: no global search bar.
- Right: notification icon only if notifications are implemented, profile avatar/name, and a small profile menu (profile/settings if available, sign out).
- Header stays visually quiet and aligned with the content grid.

### Navigation

Use a compact left sidebar on desktop and an accessible drawer/menu on narrow screens. Clearly distinguish the active route with a subtle background/accent and accessible active-state semantics.

### Main content

- Use a consistent content max-width and page padding.
- Do not add descriptive subtitles beneath every title.
- Tables should have defined edges, light borders, row separators, consistent alignment, readable empty states, and pagination when needed.
- On mobile, tables should scroll horizontally within their container or use a deliberate compact row/card representation.

## 5. Administrator pages

### 5.1 Admin dashboard / Home

Purpose: give the administrator an immediate operational overview and a concise queue of tickets that need attention.

Top summary metrics:

- **Active tickets** — currently open or being worked on.
- **Completed tickets** — resolved/closed tickets over the selected period (show the period if filterable).
- **High-priority tickets** — currently high or critical, awaiting attention.
- Optional: **Needs verification** — resolved by technicians but awaiting complainant confirmation.

Keep the metrics compact. Do not fill the page with large decorative charts. If a chart is useful, use one small chart that answers an operational question, with a clear label and time range.

The main section should be a priority queue/table titled **Tickets requiring attention**. Sort critical/high tickets first, then by age or SLA policy. It should not imply that the AI score alone determines the order.

Recommended columns:

| Column | Content |
|---|---|
| Timestamp | When the complaint was submitted; use one consistent timezone/display format |
| Ticket ID | Short readable ID; opens ticket details |
| Category | Predicted category |
| Subcategory | Predicted or manually selected subcategory; show `—` if unavailable |
| Problem | One-line complaint summary, truncated with a detail view |
| Priority | Critical / High / Medium / Low / Unknown |
| Confidence | Classification confidence as a percentage only if a calibrated/model score is available; label which score it is |
| Status | New / Triaged / Assigned / In progress / Awaiting verification / Re-evaluation / Resolved / Closed |
| Assigned to | Technician or unassigned |
| Action | View/open detail; other actions only when permitted |

If space is limited, move Ticket ID and Assigned to into the details view rather than shrinking all table text. The key table fields requested are timestamp, category, subcategory, problem, confidence score, and resolution/status.

### 5.2 Ticket details and triage review

Selecting a row opens a full ticket-detail page or wide side panel. Show:

- Original complaint and attachments.
- Category and subcategory, including ML prediction confidence if available.
- LLM severity, urgency, explanation, supporting evidence, and missing information.
- Priority-policy outcome and any human-review/escalation flag.
- Assignment, status, timeline, technician updates, action images, and resolution notes.
- Similar historical tickets and their verified resolutions, when the backend supplies them.
- Admin controls to correct category/priority, assign or reassign a technician, and escalate. Record overrides with actor, timestamp, and reason.

Do not present an LLM explanation as verified fact. Visually distinguish user-provided facts, model assessments, and technician-confirmed outcomes.

### 5.3 Registry

The Registry page is the operational record of ongoing and cleared/completed work.

- Tabs or filters: **All**, **Ongoing**, **Awaiting verification**, **Re-evaluation**, **Resolved/Closed**.
- Display ticket ID, timestamp, complainant, building, category/subcategory, priority, assigned technician, current status, and latest update.
- A ticket's history must be visible from its detail page, including status changes and re-evaluation requests.
- Use filters for status, priority, category, date range, and technician. Put these above the table, not in the global header.
- Include pagination and an explicit empty state. Do not load the entire registry into browser state at once.

### 5.4 Technicians

Provide a technician overview with filters for category, subcategory, availability, and workload.

Each technician row/card should display:

- Name and availability/status.
- Supported categories and subcategories.
- Active assigned tickets and completed tickets.
- Completion/on-time rate if calculated from real data.
- Quality score or rating only if the scoring method is defined and supported by data.
- A detail view showing workload and past assignments.

Do not invent scores or imply that a score is objective without defining its calculation. Assignment recommendations should consider expertise, availability, workload and applicable escalation rules—not completion score alone.

### 5.5 Optional administrator page: Reports

Include a compact Reports page only if time and backend data allow. It can show tickets by category, average resolution time, repeat issues, SLA performance, and re-open/re-evaluation rate. Keep it operational and avoid vanity metrics. Do not block delivery of the core pages to build this optional page.

## 6. Complainant (student/staff) pages

### 6.1 New complaint

A signed-in complainant can create a ticket with:

- Auto-generated ticket ID (from the backend).
- Timestamp set by the server; show it after submission.
- Building/location (select or concise input, according to known campus locations).
- A short problem description textarea.
- Optional screenshot/photo attachment with preview, file type/size validation, remove/replace option, and upload progress.
- Optional affected service or category only if useful; do not require users to know the technical category.
- Submit complaint button.

Keep the form minimal. Do not ask complainants to select priority; priority is assessed by the triage flow. Show confirmation and the generated ticket ID after successful submission.

### 6.2 My complaints

Show a table/list of the user's own complaints with ticket ID, submitted timestamp, short problem, priority, current status, latest update, and a link to details. Include filters for status and date if needed.

### 6.3 Complaint details and Action page

This page is important: the complainant should be able to see what has happened to their ticket.

- Show the status timeline and assigned team/technician when appropriate.
- Display technician action notes and evidence images after they are submitted.
- When the technician marks the work as ready for verification, provide two clear actions: **Confirm resolved** and **Request re-evaluation**.
- If the complainant confirms the fix, record that confirmation and update the ticket through the backend.
- If the issue is not fixed, require a short explanation and allow optional evidence attachment before submitting re-evaluation.
- Show the re-evaluation status after submission. Do not instantly mark the ticket resolved just because the technician submitted a report.
- Once confirmed, show the final outcome and timeline.

## 7. Technician pages

### 7.1 Assigned work / Queue

Show only work permitted for the signed-in technician. Provide filters for status and priority, with critical/high work surfaced first.

Recommended columns: ticket ID, created time, category/subcategory, problem summary, priority, current status, and action.

### 7.2 Ticket work page

The technician must see:

- Complaint text, building/location, attachments and ticket timeline.
- Category, subcategory, priority and relevant triage context.
- Similar prior verified resolutions when available.
- A status/action form.
- Resolution notes for the complainant and administrator.
- Optional image attachment(s) as evidence of work performed.
- A button to submit the work report and mark it **Awaiting verification**.

Technicians must not directly change a ticket to **Closed** if complainant verification is part of the configured workflow. Show successful submission and the next status after the backend confirms it.

### 7.3 Technician history / Performance

Provide the technician with their own past tickets and statuses. Show completed count, current workload, and quality/completion measures only when backed by explicit definitions and real data. Allow opening a past ticket to review the final resolution and feedback. Do not expose other technicians' private performance details unless the role's permissions allow it.

## 8. Routes and role access

Suggested routes:

```text
/login

/admin/dashboard
/admin/registry
/admin/tickets/:ticketId
/admin/technicians
/admin/reports                 # optional

/complainant/new-complaint
/complainant/my-complaints
/complainant/tickets/:ticketId

/technician/queue
/technician/tickets/:ticketId
/technician/history
```

Unauthenticated users go to `/login`. Authenticated users are routed to the dashboard/home appropriate to the role. A user who manually enters another role's URL must be blocked by a protected route and the backend must independently enforce authorization. Frontend route guards improve navigation; they are not a security boundary by themselves.

## 9. React client folder and file responsibilities

Use this structure as the initial client architecture. Keep components focused and compose pages from shared layout, table, form, badge, modal, and status-timeline components.

```text
client/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── AppRouter.tsx
│   │   └── ProtectedRoute.tsx
│   ├── layouts/
│   │   ├── AuthLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── ComplainantLayout.tsx
│   │   └── TechnicianLayout.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Spinner.tsx
│   │   └── shared/
│   │       ├── AppHeader.tsx
│   │       ├── Sidebar.tsx
│   │       ├── ProfileMenu.tsx
│   │       ├── PageTitle.tsx
│   │       ├── MetricCard.tsx
│   │       ├── PriorityBadge.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── AttachmentUpload.tsx
│   │       └── TicketTimeline.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── pages/LoginPage.tsx
│   │   │   ├── components/LoginForm.tsx
│   │   │   └── authApi.ts
│   │   ├── admin/
│   │   │   ├── pages/DashboardPage.tsx
│   │   │   ├── pages/RegistryPage.tsx
│   │   │   ├── pages/TicketDetailPage.tsx
│   │   │   ├── pages/TechniciansPage.tsx
│   │   │   └── pages/ReportsPage.tsx
│   │   ├── complainant/
│   │   │   ├── pages/NewComplaintPage.tsx
│   │   │   ├── pages/MyComplaintsPage.tsx
│   │   │   └── pages/ComplaintDetailPage.tsx
│   │   └── technician/
│   │       ├── pages/TechnicianQueuePage.tsx
│   │       ├── pages/TechnicianWorkPage.tsx
│   │       └── pages/TechnicianHistoryPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTickets.ts
│   │   ├── useDashboardStats.ts
│   │   └── useTechnicians.ts
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── ticketApi.ts
│   │   ├── triageApi.ts
│   │   ├── technicianApi.ts
│   │   └── dashboardApi.ts
│   ├── state/
│   │   └── AuthProvider.tsx
│   ├── types/
│   │   ├── auth.ts
│   │   ├── ticket.ts
│   │   ├── technician.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── permissions.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── components.css
│   └── test/
│       ├── setup.ts
│       └── example.test.tsx
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

### File ownership rules

- `pages/` assemble page layouts; keep business logic out of page components where possible.
- `components/ui/` contain reusable presentation controls without ticket-specific API calls.
- `components/shared/` contain app-wide UI such as navigation, badges, metrics, upload and timeline.
- `features/*/*Api.ts` or `services/*Api.ts` own HTTP operations; do not call `fetch` independently from random components.
- `hooks/` expose reusable loading, error and data behavior to pages/components.
- `types/` defines shared API and UI types; keep them aligned with backend schemas.
- `state/` holds app-wide authentication/session state only. Do not put all ticket tables and server data into global context.
- `styles/tokens.css` owns the palette, typography, borders, radii, spacing and shadows.
- `test/` and feature tests cover form validation, role access and ticket status transitions.

## 10. Packages and tooling

Use Node.js LTS and React with TypeScript. Vite handles the development server and production build. Use ESLint on every implementation milestone.

Recommended packages:

### Runtime dependencies

- `react`, `react-dom`
- `react-router-dom` — routing and nested role layouts
- `@tanstack/react-query` — server state, caching, loading/error states, mutation handling and invalidation
- `react-hook-form`, `zod`, `@hookform/resolvers` — typed form validation
- `lucide-react` — consistent line icons
- `clsx` — conditional class composition

### Development dependencies

- `vite`, `typescript`, `@vitejs/plugin-react`
- `eslint`, `@eslint/js`, `typescript-eslint`
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `globals`, `typescript` type packages as required by the installed React version
- `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` for tests

Use CSS Modules or organized plain CSS with design tokens; do not add a component library or utility CSS framework unless there is a clear implementation benefit. Keep the styling approach consistent.

### Required `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc -b --pretty",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Merge these scripts with dependency versions generated for the chosen Vite/React/TypeScript setup. Do not blindly replace a package manifest that already exists.

### Environment

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Only public frontend configuration belongs in `VITE_*` variables. Never put API secrets, database credentials, LLM keys or private tokens in frontend environment variables.

## 11. React state, effects and rendering rules

### State ownership

- Use `useState` for local UI state such as an open modal, selected tab, password visibility, expanded row, and draft form controls.
- Use `useEffect` for genuine React side effects such as synchronizing with a browser API, installing/removing event listeners, or integrating with a non-React widget. Always clean up subscriptions/listeners where required.
- Use TanStack Query for API/server state: tickets, dashboard metrics, technicians, registry entries, ticket details and mutation results. Prefer query/mutation hooks instead of manually duplicating network requests in `useEffect`.
- Use a small Context/provider for the authenticated user and session state. Do not create global state for every control.
- Use `useMemo` only for expensive derived calculations or referential stability that is demonstrably useful; do not memoize every variable.
- Use `useCallback` when stable callbacks are needed by memoized children or hook dependencies, not by default.

### Rendering

- Render role navigation from a typed role-to-navigation configuration.
- Use conditional rendering for loading, error, empty, permission-denied and success states; do not render a blank screen when data is pending.
- Use stable ticket IDs as React keys, never array indexes for changing/paginated records.
- Derive values like active count or filtered display rows from source data when appropriate. Avoid maintaining duplicate state for the same facts.
- Use controlled forms with schema validation and display errors beside the corresponding field.
- Disable submit buttons during pending mutations to prevent accidental duplicate requests.
- Handle request cancellation/stale query results through the selected data-fetching library's supported mechanism.

Example component pattern:

```tsx
function RegistryPage() {
  const [status, setStatus] = useState<RegistryStatus | "all">("all");
  const { data, isPending, isError, refetch } = useTickets({ status });

  if (isPending) return <RegistrySkeleton />;
  if (isError) return <LoadError onRetry={refetch} />;
  if (!data?.items.length) return <EmptyState title="No tickets found" />;

  return (
    <section>
      <PageTitle title="Registry" />
      <StatusFilter value={status} onChange={setStatus} />
      <TicketTable tickets={data.items} />
    </section>
  );
}
```

This is a pattern example. Implement the actual types, hooks and reusable components; do not copy it without defining the referenced components.

## 12. API contract expectations

Create one configured HTTP client in `services/apiClient.ts`. It should set the base URL, JSON defaults, and common error handling. It must not expose internal exception details to end users.

Coordinate these API operations with the FastAPI backend:

- Sign in / sign out / current user.
- Create complaint including multipart attachment upload.
- List tickets by role with pagination, filters and sorting.
- Read ticket details and timeline.
- Retrieve dashboard metrics.
- Retrieve technicians and workload/performance measures.
- Submit technician work report and evidence image(s).
- Complainant confirms resolution or requests re-evaluation.
- Admin updates assignment or performs a permitted priority/category override.
- Submit user feedback or corrections where supported.

Use typed request/response objects in `types/`. Confirm actual endpoint paths and schemas with the backend before connecting screens. If the API is not ready, use a clearly isolated mock data adapter—not ad-hoc fake data inside UI components. Never claim a ticket was created, a fix was applied or a complaint resolved before the API confirms the operation.

## 13. Ticket status flow

Use one shared typed status model and align it with the backend. Suggested workflow:

```text
Submitted
   ↓
Triaged
   ↓
Assigned
   ↓
In progress
   ↓
Awaiting verification
   ├── Complainant confirms → Resolved/Closed
   └── Complainant requests re-evaluation → Re-evaluation
                                               ↓
                                           In progress
```

Allow appropriate admin transitions for rejected, cancelled or escalated tickets only when the backend policy defines them. Display status history with actor and timestamp. The frontend must not independently invent state transitions.

## 14. Accessibility, responsive behaviour and quality

- Use semantic headings, navigation, buttons, labels and table markup.
- Every input must have an associated label; placeholders are not labels.
- Provide visible keyboard focus and sufficient contrast.
- Ensure dialogs trap focus appropriately and close with Escape where suitable.
- Give image uploads clear errors for unsupported files and oversize uploads.
- Provide text labels for priority/status in addition to colour.
- Test desktop, tablet and mobile widths.
- Keep component styling consistent and avoid one-off inline styles except for values that are genuinely dynamic.

## 15. Delivery checklist

- [ ] Login page follows the attached two-panel visual reference.
- [ ] Palette tokens match the supplied reference swatches.
- [ ] Header has logo/name on the left and profile on the right; no global search bar.
- [ ] Admin dashboard includes active/completed/high-priority counts and a clear ticket table.
- [ ] Registry shows ongoing, verification and completed work.
- [ ] Technician page includes categories, availability, workload and defensible performance measures.
- [ ] Complainants can submit a complaint with timestamp from the backend and optional images.
- [ ] Complainants can view technician actions and confirm or request re-evaluation.
- [ ] Technicians can submit action notes and evidence images, then review their history.
- [ ] Role-based routes and loading/error/empty states exist.
- [ ] Forms and table actions are connected to API operations or a clearly isolated mock adapter.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.

## 16. Attached visual references

### Palette reference

Use these swatches as the source for the five-colour palette; sampled reference colours are recorded in the palette table above.

![Supplied colour palette reference](./assets/color-palette-reference.png)

### Login page reference

Use the split form/illustration panel, rounded silhouette, soft shadow, and warm outer gradient as the visual reference. Recreate it as responsive HTML/CSS components; do not use the screenshot itself as a full-page background.

![Supplied login page reference](./assets/login-page-reference.png)
