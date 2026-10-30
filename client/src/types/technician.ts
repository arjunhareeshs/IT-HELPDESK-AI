export interface Technician {
  id: string;
  name: string;
  email: string;
  department: string;
  is_available: boolean;
  supported_categories: string[];
  supported_subcategories: string[];
  active_tickets_count: number;
  completed_tickets_count: number;
  on_time_rate_percent?: number | null;
  workload_status: 'Normal' | 'High' | 'Overloaded';
  availability_status?: 'available' | 'busy' | 'offline';
  max_active_tasks?: number;
  active_ticket_ids?: string[];
  skills?: { category: string; subcategory: string | null }[];
}
