const CLOSED_STATUSES = new Set(['resolved', 'closed']);

export type StatusFilter = 'all' | 'open' | 'closed';

export function formatRelativeTime(isoDate: string) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia(s)`;
}

export function statusBadgeClass(status: string) {
  return `support-status-badge support-status-badge--${status}`;
}

export function isOpenStatus(status: string) {
  return !CLOSED_STATUSES.has(status);
}

export function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'open') return isOpenStatus(status);
  return CLOSED_STATUSES.has(status);
}
