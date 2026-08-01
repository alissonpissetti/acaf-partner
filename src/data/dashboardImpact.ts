import type { MonthlyPayout } from '../types';
import { consolidatedPayoutHistory, monthOverMonthChange, quarterGrossFromHistory } from './payoutHistory';
import { payoutGrossSummary } from './payoutGross';

export type PeriodKey = 'today' | 'week' | 'month' | 'quarter';

export type PeriodImpact = {
  key: PeriodKey;
  label: string;
  grossRevenue: number;
  changePercent: number;
  detail: string;
};

export type DashboardImpact = {
  monthGross: number;
  monthChangePercent: number;
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

/** Estimativas por período derivadas do extrato do mês (mock realista para demo). */
export function buildDashboardImpact(
  payout: MonthlyPayout,
  opts?: { payoutHistoryByUnit?: Record<string, MonthlyPayout[]>; unitIds?: string[] },
): DashboardImpact {
  const { dailyGross, connectGross, totalGross: monthGross } = payoutGrossSummary(payout);
  const unitIds = opts?.unitIds ?? Object.keys(opts?.payoutHistoryByUnit ?? {});
  const history = opts?.payoutHistoryByUnit ?? {};
  const consolidated =
    unitIds.length > 0 && Object.keys(history).length > 0
      ? consolidatedPayoutHistory(history, unitIds)
      : [];
  const quarterGross =
    consolidated.length > 0
      ? quarterGrossFromHistory(history, unitIds)
      : roundMoney(monthGross * 2.88);
  const monthChangePercent = consolidated.length >= 2 ? monthOverMonthChange(consolidated) : 18;

  const todayGross = todayDailyGross(payout) + roundMoney(connectGross / 30);
  const weekGross = roundMoney(monthGross * (7 / 30) * 1.04);

  const dailySales = salesCountInMonth(payout);
  const members = activeMembers(payout);

  const periods: PeriodImpact[] = [
    {
      key: 'today',
      label: 'Hoje',
      grossRevenue: roundMoney(todayGross),
      changePercent: 12,
      detail: 'Diárias e planos pagos pelos alunos',
    },
    {
      key: 'week',
      label: 'Esta semana',
      grossRevenue: weekGross,
      changePercent: 15,
      detail: '7 dias · diárias + planos Connect',
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
      changePercent: 22,
      detail: consolidated.length > 0 ? `${consolidated.length} meses no extrato` : 'Soma estimada dos últimos 3 meses',
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

export function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}%`;
}
