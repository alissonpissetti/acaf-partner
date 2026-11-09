import type { GymStudent, MonthlyPayout } from '../types';
import { aggregatePayouts } from './aggregatePayout';
import { gymNetFromGross } from './connectFees';
import { withProjectedConnectIfOpen } from './connectPrimaryForecast';
import { payoutGrossSummary } from './payoutGross';
import {
  FORECAST_FUTURE_MONTHS,
  buildMonthKeyRange,
  monthKeyFromDate,
  monthKeyFromLabel,
  monthLabelFromKey,
} from './financialForecast';

export type HistoryRow = {
  monthLabel: string;
  dailyGross: number;
  connectGross: number;
  totalGross: number;
  totalNet: number;
  status: MonthlyPayout['status'];
};

export type StatementMonthOption = {
  /** Posição na lista ordenada (select). */
  index: number;
  monthLabel: string;
  monthKey: string;
  /**
   * Índice no array `payoutHistoryByUnit[unitId]` (0 = mês mais antigo), ou null para mês só
   * na projeção (mês atual ausente do histórico ou meses futuros).
   */
  historyIndex: number | null;
};

export function consolidatedPayoutHistory(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): HistoryRow[] {
  const ids = unitIds.filter((id) => historyByUnit[id]?.length);
  if (ids.length === 0) return [];

  const len = Math.max(...ids.map((id) => historyByUnit[id]!.length));
  const rows: HistoryRow[] = [];

  for (let i = 0; i < len; i++) {
    let dailyGross = 0;
    let connectGross = 0;
    let totalGross = 0;
    let monthLabel = '';
    let status: MonthlyPayout['status'] = 'open';

    for (const id of ids) {
      const month = historyByUnit[id]?.[i];
      if (!month) continue;
      const g = payoutGrossSummary(month);
      dailyGross += g.dailyGross;
      connectGross += g.connectGross;
      totalGross += g.totalGross;
      monthLabel = month.monthLabel;
      status = month.status;
    }

    rows.push({
      monthLabel,
      dailyGross,
      connectGross,
      totalGross,
      totalNet: gymNetFromGross(totalGross),
      status,
    });
  }

  return rows;
}

function livePayoutForUnits(
  unitIds: string[],
  payoutsByUnit: Record<string, MonthlyPayout>,
): MonthlyPayout | null {
  const scoped: Record<string, MonthlyPayout> = {};
  for (const id of unitIds) {
    const payout = payoutsByUnit[id];
    if (payout) scoped[id] = payout;
  }
  if (Object.keys(scoped).length === 0) return null;
  if (unitIds.length === 1) return scoped[unitIds[0]!]!;
  return aggregatePayouts(scoped);
}

/** Extrato do mês em aberto com planos projetados (alunos, extrato live ou mês anterior). */
export function resolveOpenMonthPayout(
  payout: MonthlyPayout,
  students: GymStudent[],
  unitIds: string[],
  historyByUnit: Record<string, MonthlyPayout[]>,
  payoutsByUnit?: Record<string, MonthlyPayout>,
): MonthlyPayout {
  if (payout.status === 'paid') return payout;

  let base = payout;
  if (payoutsByUnit) {
    const live = livePayoutForUnits(unitIds, payoutsByUnit);
    if (live) base = live;
  }

  const rows = consolidatedPayoutHistory(historyByUnit, unitIds);
  const fallback =
    rows.length >= 2
      ? payoutAtHistoryIndex(historyByUnit, unitIds, rows.length - 2).payout
      : undefined;

  return withProjectedConnectIfOpen(base, students, unitIds, fallback);
}

function emptyPayoutForLabel(monthLabel: string): MonthlyPayout {
  return {
    monthLabel,
    dailyPassGross: 0,
    dailyPassNet: 0,
    connectRepasseTotal: 0,
    totalNet: 0,
    status: 'open',
    connectLines: [],
    recentDailySales: [],
  };
}

/** Índice na lista (select) do mês atual (anchor), ou o último mês ≤ anchor. */
export function defaultStatementMonthIndex(
  options: StatementMonthOption[],
  anchor: Date = new Date(),
): number {
  if (options.length === 0) return 0;
  const anchorKey = monthKeyFromDate(anchor);
  const exact = options.findIndex((o) => o.monthKey === anchorKey);
  if (exact >= 0) return exact;
  for (let i = options.length - 1; i >= 0; i--) {
    const k = options[i]!.monthKey;
    if (k && k < anchorKey) return i;
  }
  return options.length - 1;
}

export function listStatementMonths(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): StatementMonthOption[] {
  const rows = consolidatedPayoutHistory(historyByUnit, unitIds);
  const anchor = new Date();
  const anchorKey = monthKeyFromDate(anchor);

  type Entry = { monthKey: string; monthLabel: string; historyIndex: number | null };
  const byKey = new Map<string, Entry>();

  rows.forEach((row, historyIdx) => {
    const k = monthKeyFromLabel(row.monthLabel);
    if (!k) return;
    byKey.set(k, { monthKey: k, monthLabel: row.monthLabel, historyIndex: historyIdx });
  });

  if (!byKey.has(anchorKey)) {
    byKey.set(anchorKey, {
      monthKey: anchorKey,
      monthLabel: monthLabelFromKey(anchorKey),
      historyIndex: null,
    });
  }

  const horizon = buildMonthKeyRange(anchor, 0, FORECAST_FUTURE_MONTHS);
  for (const k of horizon) {
    if (k <= anchorKey || byKey.has(k)) continue;
    byKey.set(k, { monthKey: k, monthLabel: monthLabelFromKey(k), historyIndex: null });
  }

  const sortedKeys = [...byKey.keys()].sort();
  return sortedKeys.map((k, pos) => {
    const e = byKey.get(k)!;
    return { index: pos, monthKey: k, monthLabel: e.monthLabel, historyIndex: e.historyIndex };
  });
}

function mergePayoutStatus(months: MonthlyPayout[]): MonthlyPayout['status'] {
  if (months.length === 0) return 'open';
  if (months.every((m) => m.status === 'paid')) return 'paid';
  if (months.some((m) => m.status === 'processing')) return 'processing';
  return 'open';
}

/** Extrato consolidado ou de uma unidade para um índice do histórico (0 = mês mais antigo). */
export function payoutAtHistoryIndex(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  index: number,
): { payout: MonthlyPayout; payoutsByUnit: Record<string, MonthlyPayout> } {
  const ids = unitIds.filter((id) => historyByUnit[id]?.[index]);
  const payoutsByUnit: Record<string, MonthlyPayout> = {};
  for (const id of ids) {
    payoutsByUnit[id] = historyByUnit[id]![index]!;
  }

  if (ids.length === 0) {
    return {
      payout: {
        monthLabel: '',
        dailyPassGross: 0,
        dailyPassNet: 0,
        connectRepasseTotal: 0,
        totalNet: 0,
        status: 'open',
        connectLines: [],
        recentDailySales: [],
      },
      payoutsByUnit: {},
    };
  }

  if (ids.length === 1) {
    const payout = payoutsByUnit[ids[0]!]!;
    return { payout, payoutsByUnit };
  }

  const payout = aggregatePayouts(payoutsByUnit);
  const sample = payoutsByUnit[ids[0]!]!;
  payout.monthLabel = sample.monthLabel;
  payout.status = mergePayoutStatus(Object.values(payoutsByUnit));
  payout.paidAt = Object.values(payoutsByUnit).find((m) => m.paidAt)?.paidAt;
  return { payout, payoutsByUnit };
}

export function payoutAtStatementIndex(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  option: StatementMonthOption,
  currentMonthKey: string,
  livePayoutsByUnit: Record<string, MonthlyPayout>,
): { payout: MonthlyPayout; payoutsByUnit: Record<string, MonthlyPayout> } {
  if (option.historyIndex !== null) {
    return payoutAtHistoryIndex(historyByUnit, unitIds, option.historyIndex);
  }

  const label = option.monthLabel;
  const emptyFor = () => emptyPayoutForLabel(label);

  if (option.monthKey === currentMonthKey) {
    const scoped: Record<string, MonthlyPayout> = {};
    for (const id of unitIds) {
      const live = livePayoutsByUnit[id];
      if (live) scoped[id] = { ...live, monthLabel: label };
    }
    if (Object.keys(scoped).length === 0) {
      return { payout: emptyFor(), payoutsByUnit: {} };
    }
    if (unitIds.length === 1) {
      const payout = scoped[unitIds[0]!]!;
      return { payout, payoutsByUnit: scoped };
    }
    const payout = aggregatePayouts(scoped);
    payout.monthLabel = label;
    return { payout, payoutsByUnit: scoped };
  }

  if (unitIds.length === 0) {
    return { payout: emptyFor(), payoutsByUnit: {} };
  }
  if (unitIds.length === 1) {
    const id = unitIds[0]!;
    const payout = emptyFor();
    return { payout, payoutsByUnit: { [id]: payout } };
  }
  const payoutsByUnit: Record<string, MonthlyPayout> = {};
  for (const id of unitIds) {
    payoutsByUnit[id] = emptyFor();
  }
  const payout = aggregatePayouts(payoutsByUnit);
  payout.monthLabel = label;
  payout.status = 'open';
  return { payout, payoutsByUnit };
}

/** Histórico com planos mensais projetados em meses em aberto (extrato live + assíduos Connect). */
export function enrichedConsolidatedPayoutHistory(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  students: GymStudent[],
  payoutsByUnit?: Record<string, MonthlyPayout>,
  monthOptions?: StatementMonthOption[],
  anchorMonthKey: string = monthKeyFromDate(new Date()),
): HistoryRow[] {
  const rows = consolidatedPayoutHistory(historyByUnit, unitIds);
  const lastIdx = rows.length - 1;
  const fallback =
    lastIdx > 0 ? payoutAtHistoryIndex(historyByUnit, unitIds, lastIdx - 1).payout : undefined;

  const enrichIndex = (index: number, row: HistoryRow): HistoryRow => {
    if (row.status === 'paid' || row.connectGross > 0) return row;

    let monthPayout = payoutAtHistoryIndex(historyByUnit, unitIds, index).payout;
    if (index === lastIdx && payoutsByUnit) {
      const live = livePayoutForUnits(unitIds, payoutsByUnit);
      if (live) monthPayout = live;
    }

    const enriched = withProjectedConnectIfOpen(
      monthPayout,
      students,
      unitIds,
      index === lastIdx ? fallback : undefined,
    );
    const gross = payoutGrossSummary(enriched);
    return {
      ...row,
      dailyGross: gross.dailyGross,
      connectGross: gross.connectGross,
      totalGross: gross.totalGross,
      totalNet: gymNetFromGross(gross.totalGross),
    };
  };

  if (!monthOptions?.length) {
    return rows.map((row, index) => enrichIndex(index, row));
  }

  const out: HistoryRow[] = [];
  for (const opt of monthOptions) {
    if (opt.historyIndex !== null && rows[opt.historyIndex]) {
      out.push(enrichIndex(opt.historyIndex, rows[opt.historyIndex]!));
    } else if (
      opt.historyIndex === null &&
      opt.monthKey === anchorMonthKey &&
      payoutsByUnit
    ) {
      const live = livePayoutForUnits(unitIds, payoutsByUnit);
      if (live) {
        const enriched = withProjectedConnectIfOpen(live, students, unitIds, fallback);
        const gross = payoutGrossSummary(enriched);
        out.push({
          monthLabel: opt.monthLabel,
          dailyGross: gross.dailyGross,
          connectGross: gross.connectGross,
          totalGross: gross.totalGross,
          totalNet: gymNetFromGross(gross.totalGross),
          status: live.status,
        });
      } else {
        out.push({
          monthLabel: opt.monthLabel,
          dailyGross: 0,
          connectGross: 0,
          totalGross: 0,
          totalNet: 0,
          status: 'open',
        });
      }
    } else {
      out.push({
        monthLabel: opt.monthLabel,
        dailyGross: 0,
        connectGross: 0,
        totalGross: 0,
        totalNet: 0,
        status: 'open',
      });
    }
  }
  return out;
}

export function quarterGrossFromHistory(historyByUnit: Record<string, MonthlyPayout[]>, unitIds: string[]): number {
  return consolidatedPayoutHistory(historyByUnit, unitIds).reduce((a, r) => a + r.totalGross, 0);
}

export function monthOverMonthChange(historyRows: HistoryRow[]): number {
  if (historyRows.length < 2) return 18;
  const prev = historyRows[historyRows.length - 2]!.totalGross;
  const cur = historyRows[historyRows.length - 1]!.totalGross;
  if (prev <= 0) return 0;
  return Math.round(((cur - prev) / prev) * 100);
}
