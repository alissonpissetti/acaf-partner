export type CalendarCell = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
};

const CALENDAR_WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function calendarWeekdayLabels(): readonly string[] {
  return CALENDAR_WEEKDAYS;
}

export function todayDateInput(): string {
  const now = new Date();
  return formatLocalDate(now);
}

export function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
}

export function formatCalendarDayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function isTodayDate(date: string): boolean {
  return date === todayDateInput();
}

export function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day + deltaDays);
  return formatLocalDate(next);
}

export function formatCalendarDayShort(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildMonthGrid(monthKey: string): CalendarCell[] {
  const [year, month] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayDateInput();

  let startPad = firstOfMonth.getDay() - 1;
  if (startPad < 0) startPad = 6;

  const cells: CalendarCell[] = [];

  for (let i = startPad; i > 0; i -= 1) {
    const d = new Date(year, month - 1, 1 - i);
    const date = formatLocalDate(d);
    cells.push({ date, inMonth: false, isToday: date === today });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    cells.push({ date, inMonth: true, isToday: date === today });
  }

  while (cells.length % 7 !== 0) {
    const trailing = cells.length - startPad - daysInMonth + 1;
    const d = new Date(year, month - 1, daysInMonth + trailing);
    const date = formatLocalDate(d);
    cells.push({ date, inMonth: false, isToday: date === today });
  }

  return cells;
}

export function reservationCountsByDate(
  reservations: { occurrenceDate: string }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reservations) {
    map.set(r.occurrenceDate, (map.get(r.occurrenceDate) ?? 0) + 1);
  }
  return map;
}
