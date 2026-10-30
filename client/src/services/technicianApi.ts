import { Technician } from '../types/technician';
import { request, USE_MOCKS } from './apiClient';
import { mockStore } from './mockData';

export const technicianApi = {
  async getTechnicians(): Promise<Technician[]> {
    try {
      return await request<Technician[]>('/technicians');
    } catch (err) {
      if (!USE_MOCKS) throw err;
      return mockStore.getTechnicians();
    }
  },
};
