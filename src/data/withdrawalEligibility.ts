import { connectFeePercent, gymNetFromGross } from './connectFees';
import {
  resolveConnectFeePercentForUnit,
  resolveDailyFeePercentForUnit,
  type PortalFeePolicy,
} from './platformFeePolicy';
import { payoutGrossSummary } from './payoutGross';
import type { GymUnit, MonthlyPayout } from '../types';

export const MIN_WITHDRAWAL_AMOUNT = 100;

export type WithdrawalEligibility = {
  grossBalance: number;
  dailyGross: number;
  connectGross: number;
  platformFeeTotal: number;
  platformFeeRateApplied: number;
  netAfterFee: number;
  withdrawalsCommittedGross: number;
  availableForWithdrawal: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number | null;
  closedMonthLabels: string[];
};

export function grossFromNet(net: number, feePercent: number): number {
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

/** Soma dos meses fechados com taxa por unidade (unidade → rede → global). */
export function closedMonthsGrossBalance(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  units: GymUnit[],
  policy: PortalFeePolicy,
): {
  gross: number;
  net: number;
  dailyGross: number;
  connectGross: number;
  monthLabels: string[];
  platformFeeTotal: number;
  blendedFeePercent: number;
} {
  const ids = unitIds.filter((id) => historyByUnit[id]?.length);
  if (ids.length === 0) {
    return {
      gross: 0,
      net: 0,
      dailyGross: 0,
      connectGross: 0,
      monthLabels: [],
      platformFeeTotal: 0,
      blendedFeePercent: connectFeePercent(),
    };
  }

  const unitById = new Map(units.map((u) => [u.id, u]));
  const len = Math.max(...ids.map((id) => historyByUnit[id]!.length));
  let gross = 0;
  let dailyGross = 0;
  let connectGross = 0;
  let net = 0;
  const monthLabels: string[] = [];

  for (let i = 0; i < len; i++) {
    if (!isHistoryIndexClosed(historyByUnit, ids, i)) continue;

    let monthLabel = '';
    for (const id of ids) {
      const month = historyByUnit[id]?.[i];
      if (!month) continue;
      const g = payoutGrossSummary(month);
      const u = unitById.get(id);
      const dPct = resolveDailyFeePercentForUnit(u, policy);
      const cPct = resolveConnectFeePercentForUnit(u, policy);
      dailyGross += g.dailyGross;
      connectGross += g.connectGross;
      gross += g.totalGross;
      net += gymNetFromGross(g.dailyGross, dPct) + gymNetFromGross(g.connectGross, cPct);
      monthLabel = month.monthLabel;
    }
    if (monthLabel) monthLabels.push(monthLabel);
  }

  const platformFeeTotal = Math.round((gross - net) * 100) / 100;
  const blendedFeePercent =
    gross > 0
      ? Math.round((platformFeeTotal / gross) * 10000) / 100
      : (() => {
          const u0 = unitById.get(ids[0]!);
          const d = resolveDailyFeePercentForUnit(u0, policy);
          const c = resolveConnectFeePercentForUnit(u0, policy);
          return Math.round(((d + c) / 2) * 100) / 100;
        })();

  return {
    gross,
    net: Math.round(net * 100) / 100,
    dailyGross,
    connectGross,
    monthLabels,
    platformFeeTotal,
    blendedFeePercent,
  };
}

export function computeWithdrawalEligibility(
  historyByUnit: Record<string, MonthlyPayout[]>,
  unitIds: string[],
  pendingWithdrawalsGross: number,
  units: GymUnit[],
  policy: PortalFeePolicy,
): WithdrawalEligibility {
  const closed = closedMonthsGrossBalance(historyByUnit, unitIds, units, policy);
  const totalGross = closed.gross;
  const dailyGross = closed.dailyGross;
  const connectGross = closed.connectGross;
  const platformFeeTotal = closed.platformFeeTotal;
  const feeRate = closed.blendedFeePercent;
  const netAfterFee = closed.net;
  const remainingGross = Math.max(0, totalGross - pendingWithdrawalsGross);
  const availableForWithdrawal = gymNetFromGross(remainingGross, feeRate);

  return {
    grossBalance: totalGross,
    dailyGross,
    connectGross,
    platformFeeTotal,
    platformFeeRateApplied: feeRate,
    netAfterFee,
    withdrawalsCommittedGross: pendingWithdrawalsGross,
    availableForWithdrawal: Math.max(0, Math.round(availableForWithdrawal * 100) / 100),
    minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
    maxWithdrawalAmount:
      availableForWithdrawal > 0 ? Math.round(availableForWithdrawal * 100) / 100 : null,
    closedMonthLabels: closed.monthLabels,
  };
}

/** Saques em andamento que ainda reservam saldo (não inclui pagos nem cancelados). */
export function isWithdrawalPending(status: string): boolean {
  return status === 'registered' || status === 'processing';
}
