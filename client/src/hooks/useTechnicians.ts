import { useQuery } from '@tanstack/react-query';
import { technicianApi } from '../services/technicianApi';

export function useTechnicians() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: () => technicianApi.getTechnicians(),
  });
}
