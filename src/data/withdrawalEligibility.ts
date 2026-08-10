import { acafConnectFeePercent, acafFeeFromGross, gymNetFromGross } from './acafFees';
import { payoutGrossSummary } from './payoutGross';
import type { MonthlyPayout } from '../types';

export const MIN_WITHDRAWAL_AMOUNT = 100;

export type WithdrawalEligibility = {
  grossBalance: number;
  dailyGross: number;
  connectGross: number;
  acafFeeTotal: number;
  acafFeeRateApplied: number;
  netAfterFee: number;
  withdrawalsCommittedGross: number;
  availableForWithdrawal: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number | null;
  closedMonthLabels: string[];
};

export function grossFromNet(net: number, feePercent = acafConnectFeePercent()): number {
  if (net <= 0) return 0;
  return Math.round((net / (1 - feePercent / 100)) * 100) / 100;
}

function isHistoryIndexClosed(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  index: number,
): boolean {
  const months = unitIds
    .map((id) => historyByUnit[id]?.[index])
    .filter((m): m is MonthlyPayout => m != null);
  return months.length > 0 && months.every((m) => m.status === 'paid');
}

/** Soma bruta dos meses com fechamento confirmado (status paid) no histórico. */
export function closedMonthsGrossBalance(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
): {
  gross: number;
  net: number;
  dailyGross: number;
  connectGross: number;
  monthLabels: string[];
} {
  const ids = unitIds.filter((id) => historyByUnit[id]?.length);
  if (ids.length === 0) {
    return { gross: 0, net: 0, dailyGross: 0, connectGross: 0, monthLabels: [] };
  }

  const len = Math.max(...ids.map((id) => historyByUnit[id]!.length));
  let gross = 0;
  let dailyGross = 0;
  let connectGross = 0;
  const monthLabels: string[] = [];

  for (let i = 0; i < len; i++) {
    if (!isHistoryIndexClosed(historyByUnit, ids, i)) continue;

    let monthLabel = '';
    for (const id of ids) {
      const month = historyByUnit[id]?.[i];
      if (!month) continue;
      const g = payoutGrossSummary(month);
      dailyGross += g.dailyGross;
      connectGross += g.connectGross;
      gross += g.totalGross;
      monthLabel = month.monthLabel;
    }
    if (monthLabel) monthLabels.push(monthLabel);
  }

  return {
    gross,
    net: gymNetFromGross(gross),
    dailyGross,
    connectGross,
    monthLabels,
  };
}

export function computeWithdrawalEligibility(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  pendingWithdrawalsGross: number,
): WithdrawalEligibility {
  const closed = closedMonthsGrossBalance(historyByUnit, unitIds);
  const totalGross = closed.gross;
  const dailyGross = closed.dailyGross;
  const connectGross = closed.connectGross;
  const feeRate = acafConnectFeePercent();
  const acafFeeTotal = acafFeeFromGross(totalGross);
  const netAfterFee = closed.net;
  const remainingGross = Math.max(0, totalGross - pendingWithdrawalsGross);
  const availableForWithdrawal = gymNetFromGross(remainingGross);

  return {
    grossBalance: totalGross,
    dailyGross,
    connectGross,
    acafFeeTotal,
    acafFeeRateApplied: feeRate,
    netAfterFee,
    withdrawalsCommittedGross: pendingWithdrawalsGross,
    availableForWithdrawal: Math.max(0, availableForWithdrawal),
    minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
    maxWithdrawalAmount: availableForWithdrawal > 0 ? availableForWithdrawal : null,
    closedMonthLabels: closed.monthLabels,
  };
}

/** Saques em andamento que ainda reservam saldo (não inclui pagos nem cancelados). */
export function isWithdrawalPending(status: string): boolean {
  return status === 'registered' || status === 'processing';
}
