export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  active_tickets: number;
  completed_tickets: number;
  high_priority_tickets: number;
  needs_verification_tickets: number;
  open_tickets: number;
  critical_high_tickets: number;
  resolved_today: number;
  sla_at_risk_tickets: number;
  last_updated?: string;
}

export interface FlowDataPoint {
  timestamp: string;
  label: string;
  created: number;
  resolved: number;
  backlog: number;
}

export interface SubcategoryCount {
  name: string;
  count: number;
}

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  percentage: number;
  subcategories: SubcategoryCount[];
}

export interface SeverityCategoryItem {
  category: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  overdue: number;
  total: number;
}

export interface ResolutionTimeItem {
  category: string;
  median_hours: number;
  active_work_hours: number;
  waiting_hours: number;
  ticket_count: number;
}

export interface TechnicianStatusBreakdown {
  assigned: number;
  in_progress: number;
  waiting_user: number;
  blocked: number;
  overdue: number;
}

export interface TechnicianWorkloadItem {
  technician_id: string;
  name: string;
  department: string;
  active_tickets: number;
  completed_tickets: number;
  sla_compliance_percent: number | null;
  rework_rate_percent: number | null;
  status_breakdown: TechnicianStatusBreakdown;
}

export interface SkillPerformanceItem {
  category: string;
  tickets_resolved: number;
  success_rate_percent: number;
  median_resolution_hours: number;
}

export interface TechnicianMatrixItem {
  technician_id: string;
  name: string;
  skills: Record<string, SkillPerformanceItem>;
}

export interface ApiError {
  message: string;
  status?: number;
}
