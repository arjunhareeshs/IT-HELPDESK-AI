import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '../services/ticketApi';
import { CreateComplaintDTO } from '../types/ticket';
import { sortByPriority } from '../utils/ticketOrder';

export function useTickets(params?: {
  role?: string;
  userId?: string;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketApi.getTickets(params),
    select: sortByPriority, // every ticket list shows the highest priority at the top
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketApi.getTicketById(ticketId),
    enabled: !!ticketId,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, complainant }: { data: CreateComplaintDTO; complainant: { id: string; name: string } }) =>
      ticketApi.createComplaint(data, complainant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useConfirmResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, actor }: { ticketId: string; actor: string }) =>
      ticketApi.confirmResolution(ticketId, actor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useRequestReEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, reason, actor }: { ticketId: string; reason: string; actor: string }) =>
      ticketApi.requestReEvaluation(ticketId, reason, actor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useAssignTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, technicianId, actor }: { ticketId: string; technicianId: string; actor: string }) =>
      ticketApi.assignTechnician(ticketId, technicianId, actor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useSubmitWorkReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, notes, actor }: { ticketId: string; notes: string; actor: string }) =>
      ticketApi.submitWorkReport(ticketId, notes, actor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, file, type }: { ticketId: string; file: File; type?: string }) =>
      ticketApi.uploadAttachment(ticketId, file, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
