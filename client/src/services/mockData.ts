import { Ticket, TicketStatus, SeverityLevel } from '../types/ticket';
import { Technician } from '../types/technician';
import { User } from '../types/auth';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'Dr. Helen Vance',
    email: 'admin@institution.edu',
    role: 'admin',
    department: 'IT Infrastructure & Operations',
  },
  {
    id: 'user-comp-1',
    name: 'Alex Rivera',
    email: 'arivera@helpdesk.corp',
    role: 'complainant',
    department: 'Engineering Department',
  },
  {
    id: 'user-tech-1',
    name: 'Marcus Chen',
    email: 'mchen@helpdesk.corp',
    role: 'technician',
    department: 'Network & Hardware Operations',
  },
];

export const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'tech-1',
    name: 'Marcus Chen',
    email: 'mchen@helpdesk.corp',
    department: 'Network Services',
    is_available: true,
    supported_categories: ['Network Infrastructure', 'Hardware Fault', 'Power/Electrical'],
    supported_subcategories: ['Switch/Router', 'Access Point', 'Server Rack'],
    active_tickets_count: 14,
    completed_tickets_count: 84,
    on_time_rate_percent: 94,
    workload_status: 'Normal',
  },
  {
    id: 'tech-2',
    name: 'Sarah Jenkins',
    email: 'sjenkins@helpdesk.corp',
    department: 'Desktop Support & Systems',
    is_available: true,
    supported_categories: ['Software & Licensing', 'Account & Identity', 'Printing & Peripherals'],
    supported_subcategories: ['OS Updates', 'License Server', 'Printer Queue'],
    active_tickets_count: 18,
    completed_tickets_count: 112,
    on_time_rate_percent: 91,
    workload_status: 'High',
  },
  {
    id: 'tech-3',
    name: 'Tariq Al-Mansoor',
    email: 'talmansoor@helpdesk.corp',
    department: 'AV & Conference Tech',
    is_available: true,
    supported_categories: ['Classroom AV', 'Projection Systems'],
    supported_subcategories: ['Podium PC', 'Smart Board'],
    active_tickets_count: 8,
    completed_tickets_count: 67,
    on_time_rate_percent: 96,
    workload_status: 'Normal',
  },
  {
    id: 'tech-4',
    name: 'Elena Rostova',
    email: 'erostova@tech.institution.edu',
    department: 'Server & Cloud Systems',
    is_available: false,
    supported_categories: ['Server Infrastructure', 'Database & Storage', 'Security'],
    supported_subcategories: ['Virtual Machine', 'Storage Pool', 'Firewall'],
    active_tickets_count: 12,
    completed_tickets_count: 98,
    on_time_rate_percent: 95,
    workload_status: 'Normal',
  },
];

const BUILDINGS = [
  'Science Block',
  'Examination Complex',
  'Engineering Hall',
  'Library West',
  'Operations Center',
  'East Facility',
  'Administrative Tower',
  'Research Lab 4',
  'Humanities Wing',
  'Tech Hub A',
];

const COMPLAINT_TEMPLATES = [
  {
    category: 'Network Infrastructure',
    subcategory: 'Core Switch',
    text: 'Floor switch offline affecting entire computer lab during scheduled practical exam.',
    severity: 'critical' as SeverityLevel,
  },
  {
    category: 'Network Infrastructure',
    subcategory: 'WiFi AP',
    text: 'High-density wireless access point dropping client connections constantly in study hall.',
    severity: 'high' as SeverityLevel,
  },
  {
    category: 'Hardware Fault',
    subcategory: 'Workstation Display',
    text: 'Primary monitor displaying vertical colored artifacts and failing to power on in Room 302.',
    severity: 'medium' as SeverityLevel,
  },
  {
    category: 'Software & Licensing',
    subcategory: 'Developer Tools',
    text: 'Requesting installation and activation of VS Code, Git, and Python 3.12 for upcoming term.',
    severity: 'low' as SeverityLevel,
  },
  {
    category: 'Classroom AV',
    subcategory: 'Projector Unit',
    text: 'Ceiling projector lamp warning light blinking orange with loud fan noise in Lecture Hall 1.',
    severity: 'high' as SeverityLevel,
  },
  {
    category: 'Account & Identity',
    subcategory: 'SSO Portal',
    text: 'Multi-factor authentication push notifications not arriving for institutional email logins.',
    severity: 'medium' as SeverityLevel,
  },
  {
    category: 'Printing & Peripherals',
    subcategory: 'Network Printer',
    text: 'High-capacity double-sided duplex unit jammed with paper in 2nd floor printing lounge.',
    severity: 'medium' as SeverityLevel,
  },
  {
    category: 'Power/Electrical',
    subcategory: 'Server Rack UPS',
    text: 'Uninterruptible power supply battery fault alarm sounding on floor server distribution rack.',
    severity: 'critical' as SeverityLevel,
  },
  {
    category: 'IT General Support',
    subcategory: 'Undetermined',
    text: 'Computer system is malfunctioning intermittently without clear error message.',
    severity: 'unknown' as SeverityLevel,
  },
  {
    category: 'Software & Licensing',
    subcategory: 'MATLAB Server',
    text: 'Concurrent license manager timeout error -96 when launching engineering simulation suite.',
    severity: 'high' as SeverityLevel,
  },
];

const STATUSES: TicketStatus[] = [
  'Submitted',
  'Triaged',
  'Assigned',
  'In progress',
  'Awaiting verification',
  'Re-evaluation',
];

function generate100ActiveTickets(): Ticket[] {
  const tickets: Ticket[] = [];

  for (let i = 1; i <= 100; i++) {
    const template = COMPLAINT_TEMPLATES[(i - 1) % COMPLAINT_TEMPLATES.length];
    const building = BUILDINGS[(i - 1) % BUILDINGS.length];
    const status = STATUSES[(i - 1) % STATUSES.length];
    const tech = INITIAL_TECHNICIANS[(i - 1) % INITIAL_TECHNICIANS.length];
    const padId = String(100 + i).padStart(4, '0');
    const createdMinsAgo = 10 + i * 18;

    tickets.push({
      ticket_id: `TCK-2026-${padId}`,
      created_at: new Date(Date.now() - createdMinsAgo * 60 * 1000).toISOString(),
      complaint_text: `${template.text} (${building}, Station #${(i % 30) + 1})`,
      complainant_name: i % 2 === 0 ? 'Alex Rivera' : `User ${1000 + i}`,
      complainant_id: i % 2 === 0 ? 'user-comp-1' : `user-${1000 + i}`,
      building,
      predicted_category: template.category,
      predicted_subcategory: template.subcategory,
      classification_confidence: +(0.85 + ((i % 15) * 0.01)).toFixed(2),
      severity: template.severity,
      urgency: template.severity === 'critical' ? 'immediate' : template.severity === 'high' ? 'urgent' : 'normal',
      impact_scope: template.severity === 'critical' ? 'widespread' : template.severity === 'high' ? 'multiple_users' : 'single_user',
      severity_confidence: 'high',
      service_impact: `Affecting operations in ${building}.`,
      evidence: [`Reported at ${building}`, template.text],
      missing_information: template.severity === 'unknown' ? ['Terminal identification'] : [],
      reasoning_summary: `Severity evaluated as ${template.severity} based on operational disruption.`,
      recommended_next_step: 'Dispatch assigned zone technician.',
      requires_human_review: template.severity === 'unknown',
      status,
      assigned_technician_id: status === 'Submitted' ? undefined : tech.id,
      assigned_technician_name: status === 'Submitted' ? undefined : tech.name,
      action_notes:
        status === 'Awaiting verification' || status === 'Re-evaluation'
          ? `Technician action report logged: Diagnosed component fault and applied hardware replacement. Awaiting sign-off.`
          : undefined,
      re_evaluation_reason: status === 'Re-evaluation' ? 'User reported connection dropped again after reboot.' : undefined,
      timeline: [
        {
          timestamp: new Date(Date.now() - createdMinsAgo * 60 * 1000).toISOString(),
          status: 'Submitted',
          actor: 'Complainant',
        },
        {
          timestamp: new Date(Date.now() - (createdMinsAgo - 5) * 60 * 1000).toISOString(),
          status: 'Triaged',
          actor: 'AI Severity Engine',
        },
      ],
    });
  }

  // Add 20 confirmed resolved tickets for realistic technician work history
  for (let r = 1; r <= 20; r++) {
    const template = COMPLAINT_TEMPLATES[r % COMPLAINT_TEMPLATES.length];
    const building = BUILDINGS[r % BUILDINGS.length];
    const tech = INITIAL_TECHNICIANS[r % INITIAL_TECHNICIANS.length];
    const padId = String(r).padStart(4, '0');
    const resolvedHoursAgo = 8 + r * 12;

    tickets.push({
      ticket_id: `TCK-2026-R${padId}`,
      created_at: new Date(Date.now() - (resolvedHoursAgo + 4) * 3600 * 1000).toISOString(),
      complaint_text: `${template.text} (Resolved at ${building}, Room ${100 + r})`,
      complainant_name: 'Alex Rivera',
      complainant_id: 'user-comp-1',
      building,
      predicted_category: template.category,
      predicted_subcategory: template.subcategory,
      classification_confidence: 0.94,
      severity: template.severity === 'unknown' ? 'low' : template.severity,
      urgency: 'normal',
      impact_scope: 'single_user',
      severity_confidence: 'high',
      service_impact: `Resolved issue in ${building}.`,
      evidence: [`Reported at ${building}`, 'Resolution verified by complainant'],
      missing_information: [],
      reasoning_summary: `Issue resolved and confirmed functional.`,
      recommended_next_step: 'Closed after complainant sign-off.',
      requires_human_review: false,
      status: 'Resolved',
      assigned_technician_id: tech.id,
      assigned_technician_name: tech.name,
      action_notes: `Diagnostics completed. Replaced faulty cable and verified network link. User confirmed functionality on site.`,
      resolution_confirmed_at: new Date(Date.now() - resolvedHoursAgo * 3600 * 1000).toISOString(),
      timeline: [
        {
          timestamp: new Date(Date.now() - (resolvedHoursAgo + 4) * 3600 * 1000).toISOString(),
          status: 'Submitted',
          actor: 'Alex Rivera',
        },
        {
          timestamp: new Date(Date.now() - (resolvedHoursAgo + 3) * 3600 * 1000).toISOString(),
          status: 'Assigned',
          actor: 'Admin Dispatcher',
          note: `Assigned to ${tech.name}`,
        },
        {
          timestamp: new Date(Date.now() - (resolvedHoursAgo + 1) * 3600 * 1000).toISOString(),
          status: 'Awaiting verification',
          actor: tech.name,
          note: `Work report submitted. Tested and operational.`,
        },
        {
          timestamp: new Date(Date.now() - resolvedHoursAgo * 3600 * 1000).toISOString(),
          status: 'Resolved',
          actor: 'Alex Rivera',
          note: `Complainant confirmed issue is resolved.`,
        },
      ],
    });
  }

  return tickets;
}

class MockStore {
  private tickets: Ticket[] = generate100ActiveTickets();
  private technicians: Technician[] = [...INITIAL_TECHNICIANS];

  getTickets(): Ticket[] {
    return [...this.tickets];
  }

  getTicketById(id: string): Ticket | undefined {
    return this.tickets.find((t) => t.ticket_id === id);
  }

  getTechnicians(): Technician[] {
    return [...this.technicians];
  }

  createTicket(data: {
    building: string;
    complaint_text: string;
    affected_service?: string;
    complainant_name: string;
    complainant_id: string;
  }): Ticket {
    const id = `TCK-2026-${Math.floor(2000 + Math.random() * 8000)}`;
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      ticket_id: id,
      created_at: now,
      complaint_text: data.complaint_text,
      complainant_name: data.complainant_name,
      complainant_id: data.complainant_id,
      building: data.building,
      predicted_category: data.affected_service || 'IT General Support',
      predicted_subcategory: 'Unassigned',
      classification_confidence: 0.88,
      severity: 'medium',
      urgency: 'normal',
      impact_scope: 'single_user',
      severity_confidence: 'medium',
      service_impact: 'Pending review by technician.',
      evidence: [data.complaint_text.slice(0, 60)],
      missing_information: [],
      reasoning_summary: 'Automated intake based on complainant description.',
      recommended_next_step: 'Assign to relevant zone technician.',
      requires_human_review: false,
      status: 'Submitted',
      timeline: [{ timestamp: now, status: 'Submitted', actor: data.complainant_name }],
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  updateTicketStatus(ticketId: string, status: TicketStatus, actor: string, note?: string): Ticket | undefined {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return undefined;

    ticket.status = status;
    if (note) ticket.action_notes = note;
    if (status === 'Resolved') ticket.resolution_confirmed_at = new Date().toISOString();

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      status,
      actor,
      note,
    });

    return ticket;
  }

  assignTechnician(ticketId: string, techId: string, adminActor: string): Ticket | undefined {
    const ticket = this.getTicketById(ticketId);
    const tech = this.technicians.find((t) => t.id === techId);
    if (!ticket || !tech) return undefined;

    ticket.assigned_technician_id = tech.id;
    ticket.assigned_technician_name = tech.name;
    ticket.status = 'Assigned';

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      status: 'Assigned',
      actor: adminActor,
      note: `Assigned to ${tech.name}`,
    });

    return ticket;
  }

  submitWorkReport(ticketId: string, actionNotes: string, techActor: string): Ticket | undefined {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return undefined;

    ticket.action_notes = actionNotes;
    ticket.status = 'Awaiting verification';

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      status: 'Awaiting verification',
      actor: techActor,
      note: `Work report submitted: ${actionNotes}`,
    });

    return ticket;
  }

  requestReEvaluation(ticketId: string, reason: string, complainantActor: string): Ticket | undefined {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return undefined;

    ticket.status = 'Re-evaluation';
    ticket.re_evaluation_reason = reason;

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      status: 'Re-evaluation',
      actor: complainantActor,
      note: `Re-evaluation requested: ${reason}`,
    });

    return ticket;
  }
}

export const mockStore = new MockStore();
