import { Ticket, CreateComplaintDTO, TicketStatus, SeverityLevel, TimelineEntry, Attachment } from '../types/ticket';
import { request, USE_MOCKS } from './apiClient';
import { mockStore } from './mockData';

// ---------------------------------------------------------------------------
// Backend -> UI vocabulary. The API uses machine statuses (USER_VERIFICATION) and
// event types (AUTO_TRIAGED) while the UI works with display statuses.
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, TicketStatus> = {
  OPEN: 'Submitted',
  RECEIVED: 'Submitted',
  AI_PENDING: 'Submitted',
  TRIAGE_FAILED: 'Submitted',
  TRIAGED: 'Triaged',
  QUEUED: 'Triaged',
  NEEDS_HUMAN_REVIEW: 'Triaged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLUTION_SUBMITTED: 'Awaiting verification',
  USER_VERIFICATION: 'Awaiting verification',
  AWAITING_VERIFICATION: 'Awaiting verification',
  REWORK_REQUESTED: 'Re-evaluation',
  'RE-EVALUATION': 'Re-evaluation',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Closed',
};

const EVENT_MAP: Record<string, TicketStatus> = {
  TICKET_CREATED: 'Submitted',
  AUTO_TRIAGED: 'Triaged',
  AI_TRIAGE_COMPLETED: 'Triaged',
  PRIORITY_OVERRIDE: 'Triaged',
  TECHNICIAN_ASSIGNED: 'Assigned',
  RESOLUTION_SUBMITTED: 'Awaiting verification',
  RESOLUTION_CONFIRMED: 'Resolved',
  REWORK_REQUESTED: 'Re-evaluation',
};

const PRIORITY_SEVERITY: Record<string, SeverityLevel> = {
  P1: 'critical',
  P2: 'high',
  P3: 'medium',
  P4: 'low',
};

function toStatusKey(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').toUpperCase();
}

export function normalizeStatus(raw: string | undefined | null): TicketStatus {
  if (!raw) return 'Submitted';
  const key = toStatusKey(raw);
  return STATUS_MAP[key] ?? STATUS_MAP[raw.trim().toUpperCase()] ?? 'Submitted';
}

// The backend returns snake_case/upper-case values; the mock store already uses UI values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTicket(raw: any): Ticket {
  const timeline: TimelineEntry[] | undefined = raw.timeline?.map((e: TimelineEntry & { status: string }) => ({
    ...e,
    status: EVENT_MAP[toStatusKey(e.status)] ?? normalizeStatus(e.status),
  }));
  const severity: SeverityLevel = raw.severity ?? PRIORITY_SEVERITY[raw.priority ?? ''] ?? 'unknown';

  const attachments: Attachment[] | undefined = raw.attachments?.map((att: any) => ({
    id: String(att.attachment_id || att.id || ''),
    name: att.file_name || att.name || 'Attachment',
    url: att.url,
    mime_type: att.mime_type || '',
    sizeBytes: att.file_size_bytes || att.sizeBytes,
    attachment_type: att.attachment_type || 'complaint',
    created_at: att.created_at,
  }));

  const reference_images: Attachment[] | undefined = (raw.reference_images?.map((att: any) => ({
    id: String(att.attachment_id || att.id || ''),
    name: att.file_name || att.name || 'Reference Image',
    url: att.url,
    mime_type: att.mime_type || 'image/jpeg',
    sizeBytes: att.file_size_bytes || att.sizeBytes,
    attachment_type: att.attachment_type || 'complaint',
    created_at: att.created_at,
  })) || attachments?.filter(
    (att) => att.mime_type?.startsWith('image/') || ['complaint', 'diagnostic', 'reference'].includes(att.attachment_type || '')
  ));

  return {
    ...raw,
    status: normalizeStatus(raw.status),
    severity,
    predicted_category: raw.predicted_category ?? 'Unclassified',
    timeline,
    attachments,
    reference_images,
  } as Ticket;
}

const isNumericId = (id?: string) => !!id && /^\d+$/.test(id);

export const ticketApi = {
  async getTickets(params?: {
    role?: string;
    userId?: string;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }): Promise<Ticket[]> {
    try {
      const query = new URLSearchParams();
      // Status is filtered client-side because the UI and API use different status vocabularies.
      if (params?.priority && params.priority !== 'all') query.set('priority', params.priority);
      if (params?.category && params.category !== 'all') query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      // Scope by owner when the session carries a backend user id.
      if (isNumericId(params?.userId)) {
        if (params?.role === 'complainant') query.set('raised_by_user_id', params!.userId!);
        if (params?.role === 'technician') query.set('assigned_to_user_id', params!.userId!);
      }
      const qs = query.toString();
      const tickets = (await request<unknown[]>(`/tickets${qs ? `?${qs}` : ''}`)).map(normalizeTicket);
      if (params?.status && params.status !== 'all') {
        return tickets.filter((t) => t.status.toLowerCase() === params.status!.toLowerCase());
      }
      return tickets;
    } catch (err) {
      if (!USE_MOCKS) throw err;
      let items = mockStore.getTickets();
      if (params?.role === 'complainant' && params.userId) {
        items = items.filter((t) => t.complainant_id === params.userId || t.complainant_id === 'user-comp-1');
      }
      if (params?.role === 'technician' && params.userId) {
        items = items.filter((t) => t.assigned_technician_id === params.userId || t.assigned_technician_id === 'tech-1');
      }
      if (params?.status && params.status !== 'all') {
        items = items.filter((t) => t.status.toLowerCase() === params.status?.toLowerCase());
      }
      if (params?.priority && params.priority !== 'all') {
        items = items.filter((t) => t.severity.toLowerCase() === params.priority?.toLowerCase());
      }
      return items;
    }
  },

  async getTicketById(ticketId: string): Promise<Ticket> {
    try {
      return normalizeTicket(await request<unknown>(`/tickets/${encodeURIComponent(ticketId)}`));
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const ticket = mockStore.getTicketById(ticketId);
      if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
      return ticket;
    }
  },

  async createComplaint(data: CreateComplaintDTO, complainant: { id: string; name: string }): Promise<Ticket> {
    try {
      const payload = {
        complaint_text: data.complaint_text,
        building: data.building,
        affected_service: data.affected_service,
        complainant_name: complainant.name,
        complainant_id: complainant.id,
      };
      const ticket = normalizeTicket(
        await request<unknown>('/tickets', { method: 'POST', body: JSON.stringify(payload) })
      );

      if (data.attachment) {
        try {
          const form = new FormData();
          form.append('file', data.attachment);
          form.append('attachment_type', 'complaint');
          await request(`/tickets/${encodeURIComponent(ticket.ticket_id)}/attachments`, {
            method: 'POST',
            body: form,
          });
        } catch {
          // The ticket exists already; report the partial failure instead of failing the submission.
          return { ...ticket, attachment_failed: true };
        }
      }
      return ticket;
    } catch (err) {
      if (!USE_MOCKS) throw err;
      return mockStore.createTicket({
        building: data.building,
        complaint_text: data.complaint_text,
        affected_service: data.affected_service,
        complainant_name: complainant.name,
        complainant_id: complainant.id,
      });
    }
  },

  async confirmResolution(ticketId: string, actor: string): Promise<Ticket> {
    try {
      return normalizeTicket(
        await request<unknown>(`/tickets/${encodeURIComponent(ticketId)}/confirm`, { method: 'POST' })
      );
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const updated = mockStore.updateTicketStatus(ticketId, 'Resolved', actor, 'Complainant confirmed resolution.');
      if (!updated) throw new Error('Failed to confirm resolution');
      return updated;
    }
  },

  async requestReEvaluation(ticketId: string, reason: string, actor: string): Promise<Ticket> {
    try {
      // verify-resolution with verified=false records the rejection and marks the ticket REWORK_REQUESTED.
      return normalizeTicket(
        await request<unknown>(`/tickets/${encodeURIComponent(ticketId)}/verify-resolution`, {
          method: 'POST',
          body: JSON.stringify({ verified: false, comment: reason }),
        })
      );
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const updated = mockStore.requestReEvaluation(ticketId, reason, actor);
      if (!updated) throw new Error('Failed to request re-evaluation');
      return updated;
    }
  },

  async assignTechnician(ticketId: string, technicianId: string, actor: string): Promise<Ticket> {
    try {
      return normalizeTicket(
        await request<unknown>(`/tickets/${encodeURIComponent(ticketId)}/assign`, {
          method: 'POST',
          body: JSON.stringify({ technician_id: technicianId, actor }),
        })
      );
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const updated = mockStore.assignTechnician(ticketId, technicianId, actor);
      if (!updated) throw new Error('Failed to assign technician');
      return updated;
    }
  },

  async submitWorkReport(ticketId: string, notes: string, actor: string): Promise<Ticket> {
    try {
      return normalizeTicket(
        await request<unknown>(`/tickets/${encodeURIComponent(ticketId)}/work-report`, {
          method: 'POST',
          body: JSON.stringify({ action_notes: notes, actor }),
        })
      );
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const updated = mockStore.submitWorkReport(ticketId, notes, actor);
      if (!updated) throw new Error('Failed to submit work report');
      return updated;
    }
  },

  async uploadAttachment(ticketId: string, file: File, attachmentType: string = 'diagnostic'): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file);
    form.append('attachment_type', attachmentType);
    const res = await request<any>(`/tickets/${encodeURIComponent(ticketId)}/attachments`, {
      method: 'POST',
      body: form,
    });
    return {
      id: String(res.attachment_id || res.id),
      name: res.file_name || res.name || file.name,
      url: `/api/v1/tickets/${ticketId}/attachments/${res.attachment_id || res.id}/file`,
      mime_type: res.mime_type || file.type,
      sizeBytes: res.file_size_bytes || file.size,
      attachment_type: res.attachment_type || attachmentType,
    };
  },
};
