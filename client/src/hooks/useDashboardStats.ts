import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboardApi';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 15000, // Real-time poll every 15s
  });
}

export function useTicketFlow(period: string) {
  return useQuery({
    queryKey: ['analytics-ticket-flow', period],
    queryFn: () => dashboardApi.getTicketFlow(period),
    refetchInterval: 30000,
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ['analytics-category-breakdown'],
    queryFn: () => dashboardApi.getCategoryBreakdown(),
    refetchInterval: 30000,
  });
}

export function useSeverityByCategory() {
  return useQuery({
    queryKey: ['analytics-severity-by-category'],
    queryFn: () => dashboardApi.getSeverityByCategory(),
    refetchInterval: 30000,
  });
}

export function useResolutionTime(building?: string, priority?: string) {
  return useQuery({
    queryKey: ['analytics-resolution-time', building, priority],
    queryFn: () => dashboardApi.getResolutionTime(building, priority),
    refetchInterval: 60000,
  });
}

export function useTechnicianWorkload() {
  return useQuery({
    queryKey: ['analytics-technician-workload'],
    queryFn: () => dashboardApi.getTechnicianWorkload(),
    refetchInterval: 30000,
  });
}

export function useTechnicianCategoryMatrix() {
  return useQuery({
    queryKey: ['analytics-technician-matrix'],
    queryFn: () => dashboardApi.getTechnicianCategoryMatrix(),
    refetchInterval: 60000,
  });
}
