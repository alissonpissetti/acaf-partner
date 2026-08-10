export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type UnitDaySchedule = {
  closed: boolean;
  open: string;
  close: string;
};

export type UnitWeeklySchedule = Record<DayOfWeek, UnitDaySchedule>;

export const WEEKDAY_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'segunda-feira',
  tue: 'terça-feira',
  wed: 'quarta-feira',
  thu: 'quinta-feira',
  fri: 'sexta-feira',
  sat: 'sábado',
  sun: 'domingo',
};

export function defaultWeeklySchedule(): UnitWeeklySchedule {
  const weekday = { closed: false, open: '05:30', close: '22:00' };
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { closed: false, open: '08:00', close: '16:00' },
    sun: { closed: false, open: '09:00', close: '13:00' },
  };
}

export function normalizeWeeklySchedule(input?: Partial<UnitWeeklySchedule> | null): UnitWeeklySchedule {
  const base = defaultWeeklySchedule();
  if (!input) return base;

  for (const day of WEEKDAY_ORDER) {
    const row = input[day];
    if (!row) continue;
    base[day] = {
      closed: Boolean(row.closed),
      open: row.open?.trim() || base[day].open,
      close: row.close?.trim() || base[day].close,
    };
  }

  return base;
}

export function formatDayRange(day: UnitDaySchedule): string {
  if (day.closed) return 'Fechado';
  if (!day.open || !day.close) return '—';
  return `${day.open}–${day.close}`;
}

function getTodayDayKey(): DayOfWeek {
  const map: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[new Date().getDay()];
}

export function weeklyScheduleFromUnit(unit: { weeklySchedule?: UnitWeeklySchedule | null }): UnitWeeklySchedule {
  return normalizeWeeklySchedule(unit.weeklySchedule);
}

export function isWeeklyScheduleComplete(schedule: UnitWeeklySchedule): boolean {
  const normalized = normalizeWeeklySchedule(schedule);
  return WEEKDAY_ORDER.every((day) => {
    const row = normalized[day];
    if (row.closed) return true;
    return Boolean(row.open?.trim()) && Boolean(row.close?.trim());
  });
}

export function formatWeeklyScheduleSummary(schedule: UnitWeeklySchedule): string {
  const normalized = normalizeWeeklySchedule(schedule);
  const today = getTodayDayKey();
  return `${WEEKDAY_LABELS[today]} · ${formatDayRange(normalized[today])}`;
}

export function formatOpenHoursSummary(schedule: UnitWeeklySchedule): string {
  return WEEKDAY_ORDER.map((day) => {
    const row = schedule[day];
    const label = WEEKDAY_LABELS[day].slice(0, 3);
    return `${label} ${formatDayRange(row)}`;
  }).join(' · ');
}
