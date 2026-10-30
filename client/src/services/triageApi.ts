import { Ticket, SeverityLevel } from '../types/ticket';
import { request, USE_MOCKS } from './apiClient';
import { mockStore } from './mockData';

export const triageApi = {
  async overridePriority(ticketId: string, priority: string, reason: string): Promise<Ticket> {
    try {
      return await request<Ticket>(`/triage/${ticketId}/override`, {
        method: 'POST',
        body: JSON.stringify({ priority, reason }),
      });
    } catch (err) {
      if (!USE_MOCKS) throw err;
      const ticket = mockStore.getTicketById(ticketId);
      if (!ticket) throw new Error('Ticket not found');
      ticket.severity = priority as SeverityLevel;
      if (!ticket.timeline) ticket.timeline = [];
      ticket.timeline.push({
        timestamp: new Date().toISOString(),
        status: ticket.status,
        actor: 'Administrator Override',
        note: `Priority overridden to ${priority}: ${reason}`,
      });
      return ticket;
    }
  },
};
