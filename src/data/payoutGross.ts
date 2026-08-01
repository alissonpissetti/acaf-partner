import type { MonthlyPayout } from '../types';
import {
  CORPORATE_BENEFIT_PER_MONTH,
  studentPlanTotalGross,
} from './acafFees';

export function connectPlansGross(payout: MonthlyPayout): number {
  return payout.connectLines.reduce(
    (sum, line) =>
      sum + studentPlanTotalGross(line.connectPlanId, CORPORATE_BENEFIT_PER_MONTH) * line.activeMembers,
    0,
  );
}

export function payoutGrossSummary(payout: MonthlyPayout) {
  const dailyGross = payout.dailyPassGross;
  const connectGross = connectPlansGross(payout);
  return {
    dailyGross,
    connectGross,
    totalGross: dailyGross + connectGross,
  };
}
