import type { CheckInLogEntry } from '../types';

function checkInTimeValue(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function normalizeHolderKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Data local YYYY-MM-DD de um instante ISO (mesma base que isSameLocalDay). */
export function localDateKeyFromIso(iso: string): string {
  const t = new Date(iso);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Uma entrada por pessoa/dia (mantém o check-in mais recente). */
export function dedupeCheckInsByPersonPerDay(
  log: CheckInLogEntry[],
  units?: { id: string; networkId?: string }[],
): CheckInLogEntry[] {
  const unitNetwork = new Map(units?.map((u) => [u.id, u.networkId]) ?? []);
  const sorted = sortCheckInsDescending(log);
  const seen = new Set<string>();
  const out: CheckInLogEntry[] = [];

  for (const entry of sorted) {
    const day = localDateKeyFromIso(entry.validatedAt);
    const name = normalizeHolderKey(entry.holderName);
    const key =
      entry.type === 'connect_member'
        ? `connect:${unitNetwork.get(entry.unitId) ?? entry.unitId}:${day}:${name}`
        : `daily:${entry.unitId}:${day}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }

  return out;
}

/** Ordena check-ins por data/hora decrescente (mais recente primeiro). */
export function sortCheckInsDescending(log: CheckInLogEntry[]): CheckInLogEntry[] {
  return [...log].sort(
    (a, b) => checkInTimeValue(b.validatedAt) - checkInTimeValue(a.validatedAt),
  );
}

/** Ordena check-ins por data/hora crescente (mais antigo primeiro). */
export function sortCheckInsAscending(log: CheckInLogEntry[]): CheckInLogEntry[] {
  return [...log].sort(
    (a, b) => checkInTimeValue(a.validatedAt) - checkInTimeValue(b.validatedAt),
  );
}

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
  units?: { id: string; networkId?: string }[],
): CheckInLogEntry[] {
  return dedupeCheckInsByPersonPerDay(
    log.filter((e) => e.unitId === unitId && isSameLocalDay(e.validatedAt, day)),
    units,
  );
}

/** Check-ins de hoje (dia local) para a unidade, sem duplicatas por pessoa. */
export function todayCheckInsForUnit(
  log: CheckInLogEntry[],
  unitId: string,
  units?: { id: string; networkId?: string }[],
  day: Date = new Date(),
): CheckInLogEntry[] {
  return sortCheckInsDescending(filterCheckInsByDay(log, unitId, day, units));
}

/** Demo: referência “hoje” alinhada aos dados seed (jun–ago/2026). */
export function defaultReportDay(): string {
  return '2026-08-25';
}
