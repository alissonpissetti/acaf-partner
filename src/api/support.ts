import { apiFetch } from './client';

export type SupportCatalog = {
  categories: Array<{ value: string; label: string }>;
  priorities: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
};

export type SupportTicketSummary = {
  id: string;
  code: string;
  subject: string;
  status: string;
  statusLabel: string;
  categoryLabel: string;
  updatedAt: string;
};

export type SupportTicketDetail = SupportTicketSummary & {
  description: string;
  contextLabel: string | null;
  contextUrl: string | null;
  messages: Array<{
    id: string;
    authorName: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
  }>;
};

export function fetchSupportCatalog(apiPrefix: string) {
  return apiFetch<SupportCatalog>(`${apiPrefix}/catalog`);
}

export function fetchSupportTickets(apiPrefix: string) {
  return apiFetch<{ items: SupportTicketSummary[]; total: number }>(`${apiPrefix}/tickets?limit=50`);
}

export function fetchSupportTicket(apiPrefix: string, id: string) {
  return apiFetch<SupportTicketDetail>(`${apiPrefix}/tickets/${id}`);
}

export function createSupportTicket(apiPrefix: string, payload: Record<string, unknown>) {
  return apiFetch<SupportTicketDetail>(`${apiPrefix}/tickets`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addSupportTicketMessage(apiPrefix: string, id: string, body: string) {
  return apiFetch<SupportTicketDetail>(`${apiPrefix}/tickets/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}
