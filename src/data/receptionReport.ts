import type { CheckInLogEntry } from '../types';

/** Data local YYYY-MM-DD */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  if (date.getFullYear() !== y || date.getMonth() !== m! - 1 || date.getDate() !== d!) return null;
  return date;
}

export function isSameLocalDay(iso: string, day: Date): boolean {
  const t = new Date(iso);
  return (
    t.getFullYear() === day.getFullYear() &&
    t.getMonth() === day.getMonth() &&
    t.getDate() === day.getDate()
  );
}

export function filterCheckInsByDay(
  log: CheckInLogEntry[],
  unitId: string,
  day: Date,
): CheckInLogEntry[] {
  return log
    .filter((e) => e.unitId === unitId && isSameLocalDay(e.validatedAt, day))
    .sort((a, b) => b.validatedAt.localeCompare(a.validatedAt));
}

export function recentCheckInsForUnit(log: CheckInLogEntry[], unitId: string, limit = 20): CheckInLogEntry[] {
  return log
    .filter((e) => e.unitId === unitId)
    .sort((a, b) => b.validatedAt.localeCompare(a.validatedAt))
    .slice(0, limit);
}

/** Demo: referência “hoje” alinhada aos dados seed (Jul/2026). */
export function defaultReportDay(): string {
  return '2026-07-28';
}
