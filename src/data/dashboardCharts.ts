import type { CheckInLogEntry, GymUnit, MonthlyPayout } from '../types';
import { consolidatedPayoutHistory, type HistoryRow } from './payoutHistory';
import { payoutGrossSummary } from './payoutGross';

export type RevenueTrendPoint = {
  label: string;
  daily: number;
  connect: number;
  total: number;
};

export type CompositionSlice = {
  key: 'daily' | 'connect';
  label: string;
  value: number;
  color: string;
};

export type CheckInDayPoint = {
  label: string;
  shortLabel: string;
  count: number;
};

export type UnitRevenuePoint = {
  unitId: string;
  label: string;
  total: number;
  daily: number;
  connect: number;
};

const DAILY_COLOR = '#e8881c';
const CONNECT_COLOR = '#3d6b9a';

export const DASH_CHART_COLORS = {
  daily: DAILY_COLOR,
  connect: CONNECT_COLOR,
  grid: 'rgba(0,0,0,0.08)',
  muted: 'var(--text-muted)',
};

export function buildRevenueTrend(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): RevenueTrendPoint[] {
  const rows: HistoryRow[] = consolidatedPayoutHistory(historyByUnit, unitIds);
  return rows.map((r) => ({
    label: shortMonthLabel(r.monthLabel),
    daily: r.dailyGross,
    connect: r.connectGross,
    total: r.totalGross,
  }));
}

export function buildCompositionSlices(dailyGross: number, connectGross: number): CompositionSlice[] {
  return [
    { key: 'daily', label: 'Diárias', value: dailyGross, color: DAILY_COLOR },
    { key: 'connect', label: 'Planos', value: connectGross, color: CONNECT_COLOR },
  ];
}

export function buildCheckInsLastDays(
  log: CheckInLogEntry[],
  unitIds: string[],
  days = 7,
  now = new Date(),
): CheckInDayPoint[] {
  const allowed = new Set(unitIds);
  const points: CheckInDayPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const count = log.filter((e) => {
      if (!allowed.has(e.unitId)) return false;
      const t = new Date(e.validatedAt).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;

    points.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
      shortLabel: d.toLocaleDateString('pt-BR', { weekday: 'narrow', day: '2-digit' }),
      count,
    });
  }

  return points;
}

export function buildUnitRevenueCompare(
  units: GymUnit[],
  payoutsByUnit: Record<string, MonthlyPayout>,
): UnitRevenuePoint[] {
  return units
    .map((u) => {
      const p = payoutsByUnit[u.id];
      if (!p) return null;
      const g = payoutGrossSummary(p);
      return {
        unitId: u.id,
        label: u.unitName,
        total: g.totalGross,
        daily: g.dailyGross,
        connect: g.connectGross,
      };
    })
    .filter((x): x is UnitRevenuePoint => x != null)
    .sort((a, b) => b.total - a.total);
}

function shortMonthLabel(monthLabel: string): string {
  const parts = monthLabel.trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = parts[0]!.slice(0, 3);
    const year = parts[1]!.slice(-2);
    return `${month}/${year}`;
  }
  return monthLabel.slice(0, 8);
}

export function formatCompactBRL(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (value >= 10_000) return `R$ ${Math.round(value / 1000)} mil`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} mil`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    value,
  );
}
