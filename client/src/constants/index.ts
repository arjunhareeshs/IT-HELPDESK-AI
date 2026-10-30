export const HELP_CATEGORIES = [
  'Network Outage & Wi-Fi',
  'Printing & Scanning',
  'Software Installation & License',
  'System Security & Access',
  'Hardware Failure & Peripherals',
  'Email & Collaboration Tools',
  'Account Access & Password Reset',
  'Operating System Issues',
  'Audio/Visual & Projectors',
  'Server & Cloud Hosting',
  'Database & Storage Access',
  'Telephony & VoIP',
  'Learning Management System (LMS)',
  'ERP & Operations Portal',
  'Smart Classroom Equipment',
  'Power & Physical Infrastructure',
  'Backup & Data Recovery',
  'General IT Inquiry',
] as const;

export const BUILDINGS = [
  'Main Administration Building',
  'Engineering Block A',
  'Engineering Block B',
  'Science Complex',
  'Central Library',
  'Computing Center',
  'Operations Center & Dining',
  'Residential Facility Block 1',
  'Residential Facility Block 2',
  'Auditorium & Arts Block',
] as const;

export const FACILITY_BUILDINGS = BUILDINGS;

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_verification: 'Awaiting Verification',
  re_evaluation: 'Re-evaluation',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'Unknown',
};
