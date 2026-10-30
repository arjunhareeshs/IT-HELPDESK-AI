# Frontend DOs and DON'Ts

## DO

### Design and consistency
- DO use the supplied palette tokens: `#1A1423`, `#372549`, `#774C60`, `#B75D69`, and `#EACDC2`.
- DO use Calibri as the primary typeface, with a fallback only when unavailable.
- DO recreate the login reference as a responsive split panel with a light form area and illustrated right panel.
- DO keep layouts minimal, spacing consistent, page titles short, and forms free of unnecessary helper copy.
- DO build shared components for buttons, form fields, tables, status badges, priority badges, upload controls, and ticket timelines.
- DO keep visual differences between roles limited to their navigation and task-specific content.
- DO give tables clearly defined edges, subtle row dividers, aligned columns, sensible truncation and accessible detail views.
- DO show loading, error, empty, success and permission-denied states.
- DO use status text and icons as well as colour, so the meaning does not depend on colour alone.

### React and architecture
- DO use React + TypeScript + Vite, with Node.js for package scripts and tooling.
- DO run ESLint and TypeScript checks regularly and fix warnings instead of ignoring them.
- DO keep page composition in feature pages and reusable UI in shared components.
- DO use `useState` for local interactions, `useEffect` only for actual side effects, and TanStack Query for API/server state.
- DO clean up event listeners/subscriptions and avoid effects that re-run unnecessarily.
- DO use stable IDs as React keys.
- DO keep API calls in the configured service/API layer and expose them to components through hooks.
- DO type API requests and responses, including ticket statuses, user roles, severity, priorities and technician records.
- DO centralize role and status configuration instead of scattering literal checks throughout the UI.
- DO isolate mock data from components and replace it with API calls when the backend is ready.
- DO validate forms on the client for usability and repeat all important validation on the server.
- DO disable pending submit actions and show success only after the server confirms the operation.
- DO use pagination/filter parameters from the API for large registries.
- DO confirm backend schemas and endpoint paths before integrating each feature.
- DO keep confidence scores accurately labelled: distinguish category-classifier confidence from LLM severity assessment.
- DO provide an explanation/evidence panel for triage and visually distinguish model assessment from confirmed facts.
- DO require complainant confirmation or the configured verification step before marking work resolved.
- DO record re-evaluation requests and show the ticket's updated status.
- DO test role guards, ticket transitions, attachment validation, and failure paths.
- DO make the interface keyboard-accessible and usable on mobile/tablet.

### Security and reliability
- DO let the backend enforce authentication, authorization and allowed ticket transitions.
- DO treat frontend route guards as navigation aids, not as security controls.
- DO keep secrets, private tokens, database URLs and LLM credentials out of `VITE_*` variables and browser code.
- DO validate upload type and size in the frontend and validate again on the backend.
- DO handle expired sessions, network failures and server validation errors gracefully.
- DO show only ticket data that the authenticated role is authorized to access.

## DON'T

### Design
- DON'T add a global search bar to the main header; it is explicitly excluded.
- DON'T add large blocks of introductory copy, marketing text, redundant subtitles or unnecessary descriptions under headings.
- DON'T make every card colourful or use gradients throughout the dashboard.
- DON'T use excessive shadows, glassmorphism, glowing borders, animated backgrounds, oversized icons or decorative charts.
- DON'T use random colours for each status; use the defined palette and a consistent semantic mapping.
- DON'T make table text tiny to fit every column; use horizontal overflow, responsive row layouts or detail pages.
- DON'T use colour alone to communicate criticality, completion or errors.
- DON'T add social login, recovery flows, notifications or settings controls unless those features actually work.
- DON'T invent a logo, performance score or institutional branding and present it as official. Use a clean temporary mark until the product mark is supplied.

### React and data
- DON'T put the entire application in one giant component.
- DON'T mix database/API implementation into UI components.
- DON'T call `fetch` from multiple pages with duplicated URL/error logic.
- DON'T use `useEffect` to calculate values that can be derived during render.
- DON'T use `useEffect` as a replacement for a server-state library for ordinary API caching/refetching.
- DON'T add every value to global Context or create duplicate sources of truth.
- DON'T use array indexes as keys for changing lists.
- DON'T silence TypeScript or ESLint with broad `any`, disable comments, or `eslint-disable` rules just to get a clean result.
- DON'T rely on client-side role values to authorize privileged actions.
- DON'T create fake tickets or metrics inside the production UI components.
- DON'T report a successful operation before the API has confirmed it.
- DON'T hardcode the 18 category names, severity policy or workflow status in many files; centralize them and align them with backend configuration.

### AI and ticket workflow
- DON'T assume the ML classifier's confidence is the same as severity confidence.
- DON'T label an LLM's qualitative confidence as a calibrated probability.
- DON'T show AI-generated recommendations as confirmed resolutions.
- DON'T let a prediction alone silently close a ticket or suppress an escalation.
- DON'T ask complainants to set their own priority when the workflow is designed to assess it automatically.
- DON'T let technicians bypass the configured verification/re-evaluation flow.
- DON'T invent technician completion scores or calculate them without a defined formula and enough real data.
- DON'T expose another user's complaint or a technician's restricted records to an unauthorized role.
- DON'T treat uploaded complaint text or attachments as trusted instructions.

## Definition of done

A feature is not complete merely because the screen looks correct. It is complete when the interaction works, validation and loading/error states exist, permissions are respected, the backend result is reflected accurately, and the relevant ESLint, typecheck, tests and production build pass.
