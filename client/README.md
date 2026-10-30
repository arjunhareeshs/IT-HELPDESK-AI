# IT Helpdesk Frontend Client

Institutional AI-powered IT Helpdesk Ticket Triage web application built with React, TypeScript, and Vite.

## Architecture

- **UI & Design System**: Custom design tokens adhering strictly to the 5-color palette (`#1A1423`, `#372549`, `#774C60`, `#B75D69`, `#EACDC2`) with the light blush token (`#EACDC2` / `#F6EDE8`) as the primary background surface, paired with clean white surface panels and Calibri typography.
- **Roles & Workflows**:
  - **Administrator**: Operations dashboard, priority queue, complete incident registry, technician workload directory, performance reports, and AI triage detail inspection with assignment controls.
  - **Complainant**: Minimal complaint intake with auto-generated ticket ID and server timestamp, live status tracking, and two-step verification flow (*Confirm Resolved* vs *Request Re-evaluation*).
  - **Technician**: Incident queue ordered by priority, work order action reporting with evidence notes, and verified resolution history.
- **State Management**: TanStack React Query for caching, asynchronous mutations, and cache invalidation.
- **Isolated Mock Store**: Comprehensive realistic data adapter enabling 100% interactive testing out-of-the-box, connected to the backend API via `apiClient.ts`.

## Available Scripts

In the `client/` directory:

- `npm run dev`: Starts the Vite development server (default: `http://localhost:5173`).
- `npm run build`: Typechecks and compiles production assets into `dist/`.
- `npm run typecheck`: Validates all TypeScript types with `tsc -b --pretty`.
- `npm run lint`: Runs ESLint checks.
- `npm run test`: Executes unit tests with Vitest.
