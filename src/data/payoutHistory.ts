import type { GymStudent, MonthlyPayout } from '../types';
import { aggregatePayouts } from './aggregatePayout';
import { gymNetFromGross } from './acafFees';
import { withProjectedConnectIfOpen } from './connectPrimaryForecast';
import { payoutGrossSummary } from './payoutGross';

export type HistoryRow = {
  monthLabel: string;
  dailyGross: number;
  connectGross: number;
  totalGross: number;
  totalNet: number;
  status: MonthlyPayout['status'];
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

/** Histórico com planos mensais projetados em meses em aberto (extrato live + assíduos Connect). */
export function enrichedConsolidatedPayoutHistory(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  students: GymStudent[],
  payoutsByUnit?: Record<string, MonthlyPayout>,
): HistoryRow[] {
  const rows = consolidatedPayoutHistory(historyByUnit, unitIds);
  const lastIdx = rows.length - 1;
  const fallback =
    lastIdx > 0 ? payoutAtHistoryIndex(historyByUnit, unitIds, lastIdx - 1).payout : undefined;

  return rows.map((row, index) => {
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
  });
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

export type StatementMonthOption = {
  index: number;
  monthLabel: string;
};

export function listStatementMonths(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): StatementMonthOption[] {
  return consolidatedPayoutHistory(historyByUnit, unitIds).map((row, index) => ({
    index,
    monthLabel: row.monthLabel,
  }));
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
