import type { CheckInLogEntry } from './types.js';

function checkInTimeValue(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function sortCheckInsDescending(entries: CheckInLogEntry[]): CheckInLogEntry[] {
  return [...entries].sort(
    (a, b) => checkInTimeValue(b.validatedAt) - checkInTimeValue(a.validatedAt),
  );
}

export function recentCheckInsForPortal(
  log: CheckInLogEntry[],
  unitId?: string,
  limit = 50,
): CheckInLogEntry[] {
  const filtered = unitId ? log.filter((c) => c.unitId === unitId) : log;
  return sortCheckInsDescending(filtered).slice(0, limit);
}
