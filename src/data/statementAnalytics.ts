import type { ConnectPlanId, DailyPassSale, MonthlyPayout } from '../types';
import {
  CONNECT_FEE_PERCENT,
  platformFeeFromGross,
  CORPORATE_BENEFIT_PER_MONTH,
  connectPlanPrice,
  gymNetFromGross,
} from './connectFees';
import { payoutGrossSummary } from './payoutGross';

export type StatementPlanRow = {
  connectPlanId: ConnectPlanId;
  activeMembers: number;
  checkIns: number;
  planPrice: number;
  corporatePerMember: number;
  grossPerMember: number;
  planOnlyGross: number;
  corporateGross: number;
  lineGross: number;
  platformFee: number;
  lineNet: number;
};

export type StatementClosingRow = {
  id: string;
  label: string;
  detail?: string;
  gross: number;
  platformFee: number;
  net: number;
  emphasis?: boolean;
};

export type StatementClosingDetail = {
  monthLabel: string;
  status: MonthlyPayout['status'];
  dailySalesCount: number;
  planRows: StatementPlanRow[];
  closingRows: StatementClosingRow[];
  dailySales: DailyPassSale[];
  totals: {
    dailyGross: number;
    connectPlanGross: number;
    connectCorporateGross: number;
    connectGross: number;
    totalGross: number;
    totalPlatformFee: number;
    totalNet: number;
  };
};

export function allDailySalesFromPayouts(payoutsByUnit: Record<string, MonthlyPayout>): DailyPassSale[] {
  return Object.values(payoutsByUnit)
    .flatMap((p) => p.recentDailySales)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildStatementClosingDetail(
  payout: MonthlyPayout,
  payoutsByUnit: Record<string, MonthlyPayout>,
): StatementClosingDetail {
  const grossSummary = payoutGrossSummary(payout);
  const dailySales = allDailySalesFromPayouts(payoutsByUnit);

  const planRows: StatementPlanRow[] = payout.connectLines.map((line) => {
    const planPrice = connectPlanPrice(line.connectPlanId);
    const corporatePerMember = CORPORATE_BENEFIT_PER_MONTH;
    const grossPerMember = planPrice + corporatePerMember;
    const planOnlyGross = planPrice * line.activeMembers;
    const corporateGross = corporatePerMember * line.activeMembers;
    const lineGross = grossPerMember * line.activeMembers;
    return {
      connectPlanId: line.connectPlanId,
      activeMembers: line.activeMembers,
      checkIns: line.checkIns,
      planPrice,
      corporatePerMember,
      grossPerMember,
      planOnlyGross,
      corporateGross,
      lineGross,
      platformFee: platformFeeFromGross(lineGross),
      lineNet: gymNetFromGross(lineGross),
    };
  });

  const connectPlanGross = planRows.reduce((s, r) => s + r.planOnlyGross, 0);
  const connectCorporateGross = planRows.reduce((s, r) => s + r.corporateGross, 0);
  const dailyGross = grossSummary.dailyGross;
  const connectGross = connectPlanGross + connectCorporateGross;
  const totalGross = dailyGross + connectGross;

  const dailyFee = platformFeeFromGross(dailyGross);
  const connectFee = platformFeeFromGross(connectGross);
  const dailyNet = gymNetFromGross(dailyGross);
  const connectNet = gymNetFromGross(connectGross);
  const totalPlatformFee = dailyFee + connectFee;
  const totalNet = dailyNet + connectNet;

  const closingRows: StatementClosingRow[] = [
    {
      id: 'daily',
      label: 'Diárias',
      detail:
        dailySales.length > 0
          ? `${dailySales.length} visita${dailySales.length === 1 ? '' : 's'} no período`
          : 'Sem vendas de diária',
      gross: dailyGross,
      platformFee: dailyFee,
      net: dailyNet,
    },
    {
      id: 'connect-plan',
      label: 'Planos · parte do aluno',
      detail: `${planRows.reduce((s, r) => s + r.activeMembers, 0)} assíduos`,
      gross: connectPlanGross,
      platformFee: platformFeeFromGross(connectPlanGross),
      net: gymNetFromGross(connectPlanGross),
    },
    {
      id: 'connect-corp',
      label: 'Planos · benefício corporativo',
      detail: `R$ ${CORPORATE_BENEFIT_PER_MONTH.toFixed(2).replace('.', ',')} / assíduo`,
      gross: connectCorporateGross,
      platformFee: platformFeeFromGross(connectCorporateGross),
      net: gymNetFromGross(connectCorporateGross),
    },
    {
      id: 'total',
      label: 'Total do fechamento',
      gross: totalGross,
      platformFee: totalPlatformFee,
      net: totalNet,
      emphasis: true,
    },
  ];

  return {
    monthLabel: payout.monthLabel,
    status: payout.status,
    dailySalesCount: dailySales.length,
    planRows,
    closingRows,
    dailySales,
    totals: {
      dailyGross,
      connectPlanGross,
      connectCorporateGross,
      connectGross,
      totalGross,
      totalPlatformFee,
      totalNet,
    },
  };
}

export function statementFeePercentLabel(): string {
  return `${CONNECT_FEE_PERCENT}%`;
}
