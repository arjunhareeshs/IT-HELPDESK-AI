import {
  DashboardStats,
  FlowDataPoint,
  CategoryBreakdownItem,
  SeverityCategoryItem,
  ResolutionTimeItem,
  TechnicianWorkloadItem,
  TechnicianMatrixItem,
} from '../types/api';
import { request } from './apiClient';

// All analytics are computed by the backend from real tickets. Failures propagate so the UI can
// show an error state instead of fabricated numbers.
export const dashboardApi = {
  getStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/analytics/dashboard');
  },

  getTicketFlow(period: string = 'today'): Promise<FlowDataPoint[]> {
    return request<FlowDataPoint[]>(`/analytics/ticket-flow?period=${encodeURIComponent(period)}`);
  },

  getCategoryBreakdown(): Promise<CategoryBreakdownItem[]> {
    return request<CategoryBreakdownItem[]>('/analytics/category-breakdown');
  },

  getSeverityByCategory(): Promise<SeverityCategoryItem[]> {
    return request<SeverityCategoryItem[]>('/analytics/severity-by-category');
  },

  getResolutionTime(building?: string, priority?: string): Promise<ResolutionTimeItem[]> {
    const q = new URLSearchParams();
    if (building) q.set('building', building);
    if (priority) q.set('priority', priority);
    const qs = q.toString();
    return request<ResolutionTimeItem[]>(`/analytics/resolution-time${qs ? `?${qs}` : ''}`);
  },

  getTechnicianWorkload(): Promise<TechnicianWorkloadItem[]> {
    return request<TechnicianWorkloadItem[]>('/analytics/technician-workload');
  },

  getTechnicianCategoryMatrix(): Promise<TechnicianMatrixItem[]> {
    return request<TechnicianMatrixItem[]>('/analytics/technicians/category-matrix');
  },
};
