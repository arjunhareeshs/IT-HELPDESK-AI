import { Ticket } from '../types/ticket';

const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const isDone = (t: Ticket) => t.status === 'Resolved' || t.status === 'Closed';

// Priority code first; tickets without one fall back to their severity.
const rank = (t: Ticket) => PRIORITY_RANK[t.priority ?? ''] ?? SEVERITY_RANK[t.severity] ?? 4;

/** Open tickets before finished ones, then P1 -> P4, then higher priority score, then oldest first. */
export function compareByPriority(a: Ticket, b: Ticket): number {
  return (
    Number(isDone(a)) - Number(isDone(b)) ||
    rank(a) - rank(b) ||
    (b.priority_score ?? 0) - (a.priority_score ?? 0) ||
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export const sortByPriority = (tickets: Ticket[]): Ticket[] => [...tickets].sort(compareByPriority);
