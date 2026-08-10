import { aggregatePayouts } from './aggregatePayout';
import {
  acafConnectFeePercent,
  corporateBenefitForStudent,
  gymNetFromGross,
  studentPlanTotalGross,
} from './acafFees';
import { payoutGrossSummary } from './payoutGross';
import type { GymStudent, GymUnit, MonthlyPayout } from '../types';

export const FORECAST_PAST_MONTHS = 6;
export const FORECAST_FUTURE_MONTHS = 6;
const FORECAST_SAMPLE_MONTHS = 3;

export type MonthScenarioKind = 'confirmed' | 'open' | 'forecast' | 'nodata';

export type MonthScenarioCell = {
  monthKey: string;
  monthLabel: string;
  kind: MonthScenarioKind;
  connectGross: number;
  dailyGross: number;
  totalGross: number;
  totalNet: number;
  connectMembers: number;
  dailyCount: number;
  statusLabel: string;
};

export type UnitFinancialForecast = {
  unitId: string;
  unitName: string;
  connectMembers: number;
  connectGrossMonth: number;
  avgDailiesPerMonth: number;
  avgDailyTicket: number;
  dailyGrossMonth: number;
  totalGrossMonth: number;
  totalNetMonth: number;
  connectSharePercent: number;
  dailySharePercent: number;
  sampleMonths: number;
  timeline: MonthScenarioCell[];
};

export type FinancialForecastReport = {
  units: UnitFinancialForecast[];
  totals: Omit<UnitFinancialForecast, 'unitId' | 'unitName' | 'timeline'>;
  timeline: MonthScenarioCell[];
  anchorMonthKey: string;
  sampleMonths: number;
  feePercent: number;
  kpiComparisons: ForecastKpiComparisons;
};

export type ForecastKpiComparison = {
  changePercent: number | null;
  periodLabel: string;
};

export type ForecastKpiComparisons = {
  nextMonth: ForecastKpiComparison;
  confirmed: ForecastKpiComparison;
  forecastSixMonths: ForecastKpiComparison;
  netTypical: ForecastKpiComparison;
};

type HistoryMonthBucket = {
  monthKey: string;
  monthLabel: string;
  byUnit: Record<string, MonthlyPayout>;
};

const PT_MONTH_INDEX: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeMonthToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function monthKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthLabelFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y!, m! - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const PT_MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

/** Cabeçalho compacto sem "de" (ex.: "Set 2026"). */
export function shortMonthLabelFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const month = PT_MONTH_SHORT[m! - 1] ?? monthKey;
  return `${month} ${y}`;
}

export function monthKeyFromLabel(monthLabel: string): string | null {
  const parts = monthLabel.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const year = parts.find((p) => /^\d{4}$/.test(p));
  const monthToken = normalizeMonthToken(parts[0]!);
  const month = PT_MONTH_INDEX[monthToken];
  if (!year || !month) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function buildMonthKeyRange(
  anchor: Date,
  past = FORECAST_PAST_MONTHS,
  future = FORECAST_FUTURE_MONTHS,
): string[] {
  const keys: string[] = [];
  for (let offset = -past; offset <= future; offset++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

/** Meses com extrato (até `past` antes do mês atual) + 6 futuros projetados. */
export function buildTimelineMonthKeys(
  anchor: Date,
  historyMap: Map<string, HistoryMonthBucket>,
  past = FORECAST_PAST_MONTHS,
  future = FORECAST_FUTURE_MONTHS,
): string[] {
  const anchorKey = monthKeyFromDate(anchor);
  const historyKeys = [...historyMap.keys()].sort();
  const pastWithData = historyKeys.filter((k) => k <= anchorKey);
  const pastKeys =
    pastWithData.length > past ? pastWithData.slice(-past) : pastWithData;

  const futureKeys: string[] = [];
  for (let offset = 1; offset <= future; offset++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    futureKeys.push(monthKeyFromDate(d));
  }

  return [...pastKeys, ...futureKeys];
}

function mergePayoutStatus(months: MonthlyPayout[]): MonthlyPayout['status'] {
  if (months.length === 0) return 'open';
  if (months.every((m) => m.status === 'paid')) return 'paid';
  if (months.some((m) => m.status === 'processing')) return 'processing';
  return 'open';
}

function statusLabelForKind(kind: MonthScenarioKind, status?: MonthlyPayout['status']): string {
  if (kind === 'nodata') return 'Sem dados';
  if (kind === 'forecast') return 'Previsão';
  if (kind === 'open') return 'Em aberto';
  if (status === 'processing') return 'Processando';
  if (status === 'paid') return 'Fechado';
  return 'Confirmado';
}

function buildHistoryByMonthKey(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): Map<string, HistoryMonthBucket> {
  const map = new Map<string, HistoryMonthBucket>();
  for (const unitId of unitIds) {
    for (const month of historyByUnit[unitId] ?? []) {
      const monthKey = monthKeyFromLabel(month.monthLabel);
      if (!monthKey) continue;
      const bucket = map.get(monthKey) ?? {
        monthKey,
        monthLabel: month.monthLabel,
        byUnit: {},
      };
      bucket.byUnit[unitId] = month;
      if (!bucket.monthLabel) bucket.monthLabel = month.monthLabel;
      map.set(monthKey, bucket);
    }
  }
  return map;
}

function cellFromPayout(
  monthKey: string,
  monthLabel: string,
  payout: MonthlyPayout,
  kind: MonthScenarioKind,
  status?: MonthlyPayout['status'],
): MonthScenarioCell {
  const { dailyGross, connectGross, totalGross } = payoutGrossSummary(payout);
  return {
    monthKey,
    monthLabel,
    kind,
    connectGross,
    dailyGross,
    totalGross,
    totalNet: gymNetFromGross(totalGross),
    connectMembers: payout.connectLines.reduce((a, l) => a + l.activeMembers, 0),
    dailyCount: payout.recentDailySales.length,
    statusLabel: statusLabelForKind(kind, status),
  };
}

function cellFromProjection(
  monthKey: string,
  monthLabel: string,
  projection: {
    connectGrossMonth: number;
    dailyGrossMonth: number;
    totalGrossMonth: number;
    totalNetMonth: number;
    connectMembers: number;
    avgDailiesPerMonth: number;
  },
): MonthScenarioCell {
  return {
    monthKey,
    monthLabel,
    kind: 'forecast',
    connectGross: projection.connectGrossMonth,
    dailyGross: projection.dailyGrossMonth,
    totalGross: projection.totalGrossMonth,
    totalNet: projection.totalNetMonth,
    connectMembers: projection.connectMembers,
    dailyCount: projection.avgDailiesPerMonth,
    statusLabel: 'Previsão',
  };
}

function cellNoData(monthKey: string, monthLabel: string): MonthScenarioCell {
  return {
    monthKey,
    monthLabel,
    kind: 'nodata',
    connectGross: 0,
    dailyGross: 0,
    totalGross: 0,
    totalNet: 0,
    connectMembers: 0,
    dailyCount: 0,
    statusLabel: 'Sem dados',
  };
}

function avgDailyFromHistory(
  history: MonthlyPayout[],
  unit: GymUnit,
  sampleSize = FORECAST_SAMPLE_MONTHS,
): { gross: number; count: number; months: number; ticket: number } {
  const sample = history.length > 0 ? history.slice(-sampleSize) : [];

  if (sample.length === 0) {
    return { gross: 0, count: 0, months: 0, ticket: unit.dailyPassPrice };
  }

  const grossSum = sample.reduce((a, m) => a + m.dailyPassGross, 0);
  const countSum = sample.reduce((a, m) => a + m.recentDailySales.length, 0);
  const gross = grossSum / sample.length;
  const count = countSum / sample.length;
  const ticket = count > 0 ? gross / count : unit.dailyPassPrice > 0 ? unit.dailyPassPrice : 0;

  return {
    gross: roundMoney(gross),
    count: Math.round(count),
    months: sample.length,
    ticket: roundMoney(ticket),
  };
}

function connectForecastFromStudents(students: GymStudent[], unitId: string): {
  members: number;
  gross: number;
} {
  const members = students.filter(
    (s) => s.unitId === unitId && s.channel === 'connect_primary' && s.connectPlanId,
  );
  const gross = members.reduce(
    (sum, s) =>
      sum + studentPlanTotalGross(s.connectPlanId!, corporateBenefitForStudent(s)),
    0,
  );
  return { members: members.length, gross: roundMoney(gross) };
}

function connectForecastFromPayout(payout: MonthlyPayout | undefined): {
  members: number;
  gross: number;
} {
  if (!payout) return { members: 0, gross: 0 };
  const { connectGross } = payoutGrossSummary(payout);
  const members = payout.connectLines.reduce((a, l) => a + l.activeMembers, 0);
  return { members, gross: roundMoney(connectGross) };
}

function unitProjectionBase(
  unit: GymUnit,
  students: GymStudent[],
  payoutHistoryByUnit: Record<string, MonthlyPayout[]>,
  payoutsByUnit: Record<string, MonthlyPayout>,
): Omit<UnitFinancialForecast, 'unitId' | 'unitName' | 'timeline'> {
  const history = payoutHistoryByUnit[unit.id] ?? [];
  const currentPayout = payoutsByUnit[unit.id];
  const dailyAvg = avgDailyFromHistory(history, unit);

  const fromStudents = connectForecastFromStudents(students, unit.id);
  const connect =
    fromStudents.members > 0 ? fromStudents : connectForecastFromPayout(currentPayout);

  const connectGrossMonth = connect.gross;
  const dailyGrossMonth = dailyAvg.gross;
  const totalGrossMonth = roundMoney(connectGrossMonth + dailyGrossMonth);
  const totalNetMonth = gymNetFromGross(totalGrossMonth);
  const connectSharePercent =
    totalGrossMonth > 0 ? roundMoney((connectGrossMonth / totalGrossMonth) * 100) : 0;
  const dailySharePercent =
    totalGrossMonth > 0 ? roundMoney((dailyGrossMonth / totalGrossMonth) * 100) : 0;

  return {
    connectMembers: connect.members,
    connectGrossMonth,
    avgDailiesPerMonth: dailyAvg.count,
    avgDailyTicket: dailyAvg.ticket,
    dailyGrossMonth,
    totalGrossMonth,
    totalNetMonth,
    connectSharePercent,
    dailySharePercent,
    sampleMonths: dailyAvg.months,
  };
}

function buildUnitTimeline(
  monthKeys: string[],
  anchorMonthKey: string,
  historyMap: Map<string, HistoryMonthBucket>,
  unitId: string,
  projection: Omit<UnitFinancialForecast, 'unitId' | 'unitName' | 'timeline'>,
): MonthScenarioCell[] {
  return monthKeys.map((monthKey) => {
    const monthLabel = monthLabelFromKey(monthKey);
    const bucket = historyMap.get(monthKey);
    const isFuture = monthKey > anchorMonthKey;
    const payout = bucket?.byUnit[unitId];

    if (isFuture) {
      return cellFromProjection(monthKey, monthLabel, projection);
    }

    if (payout) {
      const kind: MonthScenarioKind =
        monthKey === anchorMonthKey && payout.status !== 'paid' ? 'open' : 'confirmed';
      return cellFromPayout(
        monthKey,
        bucket?.monthLabel ?? monthLabel,
        payout,
        kind,
        payout.status,
      );
    }

    return cellNoData(monthKey, bucket?.monthLabel ?? monthLabel);
  });
}

function buildConsolidatedTimeline(
  monthKeys: string[],
  anchorMonthKey: string,
  historyMap: Map<string, HistoryMonthBucket>,
  unitIds: string[],
  projection: Omit<UnitFinancialForecast, 'unitId' | 'unitName' | 'timeline'>,
): MonthScenarioCell[] {
  return monthKeys.map((monthKey) => {
    const monthLabel = monthLabelFromKey(monthKey);
    const bucket = historyMap.get(monthKey);
    const isFuture = monthKey > anchorMonthKey;

    if (isFuture) {
      return cellFromProjection(monthKey, monthLabel, projection);
    }

    if (bucket) {
      const scoped: Record<string, MonthlyPayout> = {};
      for (const id of unitIds) {
        const month = bucket.byUnit[id];
        if (month) scoped[id] = month;
      }

      if (Object.keys(scoped).length > 0) {
        const payout =
          unitIds.length === 1 ? scoped[unitIds[0]!]! : aggregatePayouts(scoped);
        const status = mergePayoutStatus(Object.values(scoped));
        const kind: MonthScenarioKind =
          monthKey === anchorMonthKey && status !== 'paid' ? 'open' : 'confirmed';

        return cellFromPayout(
          monthKey,
          bucket.monthLabel || monthLabel,
          payout,
          kind,
          status,
        );
      }
    }

    return cellNoData(monthKey, bucket?.monthLabel ?? monthLabel);
  });
}

function sumForecasts(
  rows: Omit<UnitFinancialForecast, 'timeline'>[],
): Omit<UnitFinancialForecast, 'unitId' | 'unitName' | 'timeline'> {
  const connectMembers = rows.reduce((a, r) => a + r.connectMembers, 0);
  const connectGrossMonth = roundMoney(rows.reduce((a, r) => a + r.connectGrossMonth, 0));
  const dailyGrossMonth = roundMoney(rows.reduce((a, r) => a + r.dailyGrossMonth, 0));
  const totalGrossMonth = roundMoney(connectGrossMonth + dailyGrossMonth);
  const totalNetMonth = gymNetFromGross(totalGrossMonth);
  const avgDailiesPerMonth = rows.length
    ? Math.round(rows.reduce((a, r) => a + r.avgDailiesPerMonth, 0) / rows.length)
    : 0;
  const avgDailyTicket =
    rows.length > 0 && avgDailiesPerMonth > 0
      ? roundMoney(dailyGrossMonth / avgDailiesPerMonth)
      : 0;
  const sampleMonths = rows.reduce((max, r) => Math.max(max, r.sampleMonths), 0);

  return {
    connectMembers,
    connectGrossMonth,
    avgDailiesPerMonth,
    avgDailyTicket,
    dailyGrossMonth,
    totalGrossMonth,
    totalNetMonth,
    connectSharePercent:
      totalGrossMonth > 0 ? roundMoney((connectGrossMonth / totalGrossMonth) * 100) : 0,
    dailySharePercent:
      totalGrossMonth > 0 ? roundMoney((dailyGrossMonth / totalGrossMonth) * 100) : 0,
    sampleMonths,
  };
}

function changePercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildForecastKpiComparisons(
  timeline: MonthScenarioCell[],
  anchorMonthKey: string,
  typicalNetMonth: number,
): ForecastKpiComparisons {
  const withData = timeline.filter((m) => m.kind !== 'nodata');
  const anchor = withData.find((m) => m.monthKey === anchorMonthKey);
  const confirmed = withData.filter((m) => m.kind === 'confirmed');
  const forecast = timeline.filter((m) => m.kind === 'forecast');
  const nextForecast = forecast[0];
  const pastMonths = withData.filter((m) => m.kind !== 'forecast');

  const monthBefore = (key: string) => withData.filter((m) => m.monthKey < key).at(-1);

  const lastClosed = confirmed.at(-1);
  const prevClosed = confirmed.at(-2);

  const avgPast =
    pastMonths.length > 0
      ? pastMonths.reduce((a, m) => a + m.totalGross, 0) / pastMonths.length
      : 0;
  const forecastTotal = forecast.reduce((a, m) => a + m.totalGross, 0);
  const extrapolatedSixFromPast = avgPast * FORECAST_FUTURE_MONTHS;

  const prevAnchor = anchor ? monthBefore(anchor.monthKey) : undefined;
  const compareNetBase = prevAnchor?.totalNet ?? anchor?.totalNet;

  return {
    nextMonth: {
      changePercent:
        nextForecast && anchor
          ? changePercent(nextForecast.totalGross, anchor.totalGross)
          : null,
      periodLabel: anchor ? shortMonthLabelFromKey(anchor.monthKey) : 'mês anterior',
    },
    confirmed: {
      changePercent:
        lastClosed && prevClosed
          ? changePercent(lastClosed.totalGross, prevClosed.totalGross)
          : null,
      periodLabel: prevClosed ? shortMonthLabelFromKey(prevClosed.monthKey) : 'período anterior',
    },
    forecastSixMonths: {
      changePercent:
        forecastTotal > 0 && extrapolatedSixFromPast > 0
          ? changePercent(forecastTotal, extrapolatedSixFromPast)
          : null,
      periodLabel: 'média dos meses com extrato (×6)',
    },
    netTypical: {
      changePercent:
        compareNetBase != null && compareNetBase > 0
          ? changePercent(typicalNetMonth, compareNetBase)
          : null,
      periodLabel: prevAnchor
        ? shortMonthLabelFromKey(prevAnchor.monthKey)
        : anchor
          ? shortMonthLabelFromKey(anchor.monthKey)
          : 'mês anterior',
    },
  };
}

export function buildFinancialForecast(
  units: GymUnit[],
  students: GymStudent[],
  payoutHistoryByUnit: Record<string, MonthlyPayout[]>,
  payoutsByUnit: Record<string, MonthlyPayout>,
  unitIds?: string[],
  anchorDate = new Date(),
): FinancialForecastReport {
  const ids = unitIds ?? units.map((u) => u.id);
  const scopedUnits = units.filter((u) => ids.includes(u.id));
  const anchorMonthKey = monthKeyFromDate(anchorDate);
  const historyMap = buildHistoryByMonthKey(payoutHistoryByUnit, ids);
  const monthKeys = buildTimelineMonthKeys(anchorDate, historyMap);

  const unitRows: UnitFinancialForecast[] = scopedUnits.map((unit) => {
    const projection = unitProjectionBase(
      unit,
      students,
      payoutHistoryByUnit,
      payoutsByUnit,
    );
    const timeline = buildUnitTimeline(
      monthKeys,
      anchorMonthKey,
      historyMap,
      unit.id,
      projection,
    );
    return {
      unitId: unit.id,
      unitName: unit.unitName,
      ...projection,
      timeline,
    };
  });

  const totalsProjection = sumForecasts(unitRows);
  const timeline = buildConsolidatedTimeline(
    monthKeys,
    anchorMonthKey,
    historyMap,
    ids,
    totalsProjection,
  );

  return {
    units: unitRows,
    totals: totalsProjection,
    timeline,
    anchorMonthKey,
    sampleMonths: FORECAST_SAMPLE_MONTHS,
    feePercent: acafConnectFeePercent(),
    kpiComparisons: buildForecastKpiComparisons(
      timeline,
      anchorMonthKey,
      totalsProjection.totalNetMonth,
    ),
  };
}
