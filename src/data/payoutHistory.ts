import type { MonthlyPayout } from '../types';
import { aggregatePayouts } from './aggregatePayout';
import { gymNetFromGross } from './acafFees';
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
