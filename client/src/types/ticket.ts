export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
export type UrgencyLevel = 'immediate' | 'urgent' | 'normal' | 'undetermined';
export type ImpactScope = 'widespread' | 'multiple_users' | 'single_user' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type PriorityCode = 'P1' | 'P2' | 'P3' | 'P4';

export type TicketStatus =
  | 'Submitted'
  | 'Triaged'
  | 'Assigned'
  | 'In progress'
  | 'Awaiting verification'
  | 'Re-evaluation'
  | 'Resolved'
  | 'Closed';

export interface TimelineEntry {
  timestamp: string;
  status: TicketStatus;
  actor: string;
  note?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type?: string;
  sizeBytes?: number;
  attachment_type?: string;
  created_at?: string;
}

export interface Ticket {
  ticket_id: string;
  created_at: string;
  complaint_text: string;
  complainant_name: string;
  complainant_id: string;
  building: string;
  predicted_category: string;
  predicted_subcategory?: string;
  classification_confidence?: number; // ML calibrated probability
  severity: SeverityLevel;
  priority?: PriorityCode | null;
  priority_score?: number | null;
  urgency?: UrgencyLevel;
  impact_scope?: ImpactScope;
  severity_confidence?: ConfidenceLevel; // LLM qualitative confidence
  service_impact?: string;
  evidence?: string[];
  missing_information?: string[];
  reasoning_summary?: string;
  recommended_next_step?: string;
  requires_human_review?: boolean;
  status: TicketStatus;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  attachments?: Attachment[];
  reference_images?: Attachment[];
  action_notes?: string;
  action_images?: string[];
  resolution_confirmed_at?: string;
  re_evaluation_reason?: string;
  timeline?: TimelineEntry[];
  attachment_failed?: boolean; // client-side flag: ticket was created but the attachment upload failed
}

export interface CreateComplaintDTO {
  building: string;
  complaint_text: string;
  affected_service?: string;
  attachment?: File | null;
}

export interface TechnicianWorkReportDTO {
  ticket_id: string;
  action_notes: string;
  evidence_images?: File[];
}
