import type { GymStudent, MonthlyPayout } from '../types';
import {
  consolidatedPayoutHistory,
  enrichedConsolidatedPayoutHistory,
  resolveOpenMonthPayout,
  type HistoryRow,
} from './payoutHistory';
import { payoutGrossSummary } from './payoutGross';

export type PeriodKey = 'today' | 'week' | 'month' | 'quarter';

export type PeriodImpact = {
  key: PeriodKey;
  label: string;
  grossRevenue: number;
  /** null quando não há base real para comparar (não exibimos variação inventada). */
  changePercent: number | null;
  detail: string;
};

export type DashboardImpact = {
  monthGross: number;
  monthChangePercent: number | null;
  monthDailyGross: number;
  monthConnectGross: number;
  periods: PeriodImpact[];
  salesViaAppMonth: number;
  activeConnectMembers: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function salesCountInMonth(payout: MonthlyPayout): number {
  return payout.recentDailySales.length;
}

function todayDailyGross(payout: MonthlyPayout): number {
  const today = new Date().toDateString();
  return payout.recentDailySales
    .filter((s) => new Date(s.date).toDateString() === today)
    .reduce((a, s) => a + s.gross, 0);
}

function activeMembers(payout: MonthlyPayout): number {
  return payout.connectLines.reduce((a, l) => a + l.activeMembers, 0);
}

/** Estimativas por período derivadas do extrato do mês. */
export function buildDashboardImpact(
  payout: MonthlyPayout,
  opts?: {
    payoutHistoryByUnit?: Record<string, MonthlyPayout[]>;
    unitIds?: string[];
    students?: GymStudent[];
    payoutsByUnit?: Record<string, MonthlyPayout>;
  },
): DashboardImpact {
  const unitIds = opts?.unitIds ?? Object.keys(opts?.payoutHistoryByUnit ?? {});
  const history = opts?.payoutHistoryByUnit ?? {};
  const effectivePayout = resolveOpenMonthPayout(
    payout,
    opts?.students ?? [],
    unitIds,
    history,
    opts?.payoutsByUnit,
  );
  const { dailyGross, connectGross, totalGross: monthGross } = payoutGrossSummary(effectivePayout);
  const rawHistory =
    unitIds.length > 0 && Object.keys(history).length > 0
      ? consolidatedPayoutHistory(history, unitIds)
      : [];
  // Mesmo histórico do gráfico "Evolução da receita" (mês em aberto com planos projetados),
  // para que a variação do topo bata com o que o gráfico mostra.
  const consolidated: HistoryRow[] =
    rawHistory.length > 0
      ? enrichedConsolidatedPayoutHistory(history, unitIds, opts?.students ?? [], opts?.payoutsByUnit)
      : [];
  const lastThree = consolidated.slice(-3);
  const quarterGross =
    lastThree.length > 0
      ? roundMoney(lastThree.reduce((a, r) => a + r.totalGross, 0))
      : monthGross;
  const monthChangePercent = changeBetweenLastMonths(consolidated);

  const todayGross = todayDailyGross(payout) + roundMoney(connectGross / 30);
  const weekGross = roundMoney(monthGross * (7 / 30));

  const dailySales = salesCountInMonth(payout);
  const members = activeMembers(effectivePayout);

  const periods: PeriodImpact[] = [
    {
      key: 'today',
      label: 'Hoje',
      grossRevenue: roundMoney(todayGross),
      changePercent: null,
      detail: 'Diárias de hoje + planos (média diária)',
    },
    {
      key: 'week',
      label: 'Esta semana',
      grossRevenue: weekGross,
      changePercent: null,
      detail: 'Estimativa a partir do mês atual',
    },
    {
      key: 'month',
      label: 'Este mês',
      grossRevenue: monthGross,
      changePercent: monthChangePercent,
      detail: payout.monthLabel,
    },
    {
      key: 'quarter',
      label: 'Trimestre',
      grossRevenue: quarterGross,
      changePercent: null,
      detail:
        lastThree.length >= 3
          ? `${lastThree[0]!.monthLabel} a ${lastThree[2]!.monthLabel}`
          : `${lastThree.length || 1} ${lastThree.length === 1 ? 'mês' : 'meses'} com extrato`,
    },
  ];

  return {
    monthGross,
    monthChangePercent,
    monthDailyGross: dailyGross,
    monthConnectGross: connectGross,
    periods,
    salesViaAppMonth: dailySales,
    activeConnectMembers: members,
  };
}

function changeBetweenLastMonths(rows: HistoryRow[]): number | null {
  if (rows.length < 2) return null;
  const prev = rows[rows.length - 2]!.totalGross;
  const cur = rows[rows.length - 1]!.totalGross;
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}%`;
}
