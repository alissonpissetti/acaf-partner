import type { ConnectPlanId, DailyPassSale, GymUnit, MonthlyPayout } from '../types';
import {
  CORPORATE_BENEFIT_PER_MONTH,
  connectPlanPrice,
  gymNetFromGross,
  platformFeeFromGross,
} from './connectFees';
import { payoutGrossSummary } from './payoutGross';
import {
  resolveConnectFeePercentForUnit,
  resolveDailyFeePercentForUnit,
  type PortalFeePolicy,
} from './platformFeePolicy';

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
  feePercentApplied: number;
};

export type StatementClosingRow = {
  id: string;
  label: string;
  detail?: string;
  gross: number;
  platformFee: number;
  net: number;
  feePercentApplied: number;
  emphasis?: boolean;
};

export type StatementClosingDetail = {
  monthLabel: string;
  status: MonthlyPayout['status'];
  dailySalesCount: number;
  planRows: StatementPlanRow[];
  closingRows: StatementClosingRow[];
  dailySales: DailyPassSale[];
  feeLabels: {
    /** Resumo da coluna de taxa (pode mencionar várias %). */
    summary: string;
    dailyLine: string;
    connectLine: string;
  };
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

export type StatementClosingContext = {
  units: GymUnit[];
  policy: PortalFeePolicy;
  activeUnitId: string;
  isAllUnits: boolean;
};

function unitByIdMap(units: GymUnit[]): Map<string, GymUnit> {
  return new Map(units.map((u) => [u.id, u]));
}

/** Média ponderada pelo bruto de planos de cada unidade (visão consolidada). */
function weightedConnectFeePercent(
  payoutsByUnit: Record<string, MonthlyPayout>,
  unitIds: string[],
  units: Map<string, GymUnit>,
  policy: PortalFeePolicy,
): number {
  let sumG = 0;
  let weighted = 0;
  for (const id of unitIds) {
    const p = payoutsByUnit[id];
    if (!p) continue;
    const g = payoutGrossSummary(p).connectGross;
    if (g <= 0) continue;
    const pct = resolveConnectFeePercentForUnit(units.get(id), policy);
    sumG += g;
    weighted += g * pct;
  }
  if (sumG <= 0) {
    const u = units.get(unitIds[0] ?? '');
    return resolveConnectFeePercentForUnit(u, policy);
  }
  return Math.round((weighted / sumG) * 100) / 100;
}

function weightedDailyFeePercent(
  payoutsByUnit: Record<string, MonthlyPayout>,
  unitIds: string[],
  units: Map<string, GymUnit>,
  policy: PortalFeePolicy,
): number {
  let sumG = 0;
  let weighted = 0;
  for (const id of unitIds) {
    const p = payoutsByUnit[id];
    if (!p) continue;
    const g = payoutGrossSummary(p).dailyGross;
    if (g <= 0) continue;
    const pct = resolveDailyFeePercentForUnit(units.get(id), policy);
    sumG += g;
    weighted += g * pct;
  }
  if (sumG <= 0) {
    const u = units.get(unitIds[0] ?? '');
    return resolveDailyFeePercentForUnit(u, policy);
  }
  return Math.round((weighted / sumG) * 100) / 100;
}

export function allDailySalesFromPayouts(payoutsByUnit: Record<string, MonthlyPayout>): DailyPassSale[] {
  return Object.values(payoutsByUnit)
    .flatMap((p) => p.recentDailySales)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildStatementClosingDetail(
  payout: MonthlyPayout,
  payoutsByUnit: Record<string, MonthlyPayout>,
  context: StatementClosingContext,
): StatementClosingDetail {
  const { units, policy, activeUnitId, isAllUnits } = context;
  const umap = unitByIdMap(units);
  const unitIds = isAllUnits
    ? Object.keys(payoutsByUnit).filter((id) => payoutsByUnit[id])
    : [activeUnitId];

  const connectFeeBlend = weightedConnectFeePercent(payoutsByUnit, unitIds, umap, policy);
  const dailyFeeBlend = weightedDailyFeePercent(payoutsByUnit, unitIds, umap, policy);

  const singleUnit = !isAllUnits ? umap.get(activeUnitId) : undefined;
  const connectPctForPlans = isAllUnits ? connectFeeBlend : resolveConnectFeePercentForUnit(singleUnit, policy);
  const dailyPctDefault = isAllUnits ? dailyFeeBlend : resolveDailyFeePercentForUnit(singleUnit, policy);

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
      platformFee: platformFeeFromGross(lineGross, connectPctForPlans),
      lineNet: gymNetFromGross(lineGross, connectPctForPlans),
      feePercentApplied: connectPctForPlans,
    };
  });

  const connectPlanGross = planRows.reduce((s, r) => s + r.planOnlyGross, 0);
  const connectCorporateGross = planRows.reduce((s, r) => s + r.corporateGross, 0);
  const dailyGross = grossSummary.dailyGross;
  const connectGross = connectPlanGross + connectCorporateGross;
  const totalGross = dailyGross + connectGross;

  const dailyFee = platformFeeFromGross(dailyGross, dailyPctDefault);
  const connectPlanFee = platformFeeFromGross(connectPlanGross, connectPctForPlans);
  const connectCorpFee = platformFeeFromGross(connectCorporateGross, connectPctForPlans);
  const connectFeeTotal = connectPlanFee + connectCorpFee;
  const dailyNet = gymNetFromGross(dailyGross, dailyPctDefault);
  const connectPlanNet = gymNetFromGross(connectPlanGross, connectPctForPlans);
  const connectCorpNet = gymNetFromGross(connectCorporateGross, connectPctForPlans);
  const totalPlatformFee = dailyFee + connectFeeTotal;
  const totalNet = dailyNet + connectPlanNet + connectCorpNet;

  const feeLabels = isAllUnits
    ? {
        summary: `médias ponderadas: diárias ${dailyFeeBlend}% · planos ${connectFeeBlend}%`,
        dailyLine: `${dailyFeeBlend}% (média das unidades)`,
        connectLine: `${connectFeeBlend}% (média das unidades)`,
      }
    : {
        summary: `diárias ${dailyPctDefault}% · planos ${connectPctForPlans}%`,
        dailyLine: `${dailyPctDefault}%`,
        connectLine: `${connectPctForPlans}%`,
      };

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
      feePercentApplied: dailyPctDefault,
    },
    {
      id: 'connect-plan',
      label: 'Planos · parte do aluno',
      detail: `${planRows.reduce((s, r) => s + r.activeMembers, 0)} assíduos`,
      gross: connectPlanGross,
      platformFee: connectPlanFee,
      net: connectPlanNet,
      feePercentApplied: connectPctForPlans,
    },
    {
      id: 'connect-corp',
      label: 'Planos · benefício corporativo',
      detail: `R$ ${CORPORATE_BENEFIT_PER_MONTH.toFixed(2).replace('.', ',')} / assíduo`,
      gross: connectCorporateGross,
      platformFee: connectCorpFee,
      net: connectCorpNet,
      feePercentApplied: connectPctForPlans,
    },
    {
      id: 'total',
      label: 'Total do fechamento',
      gross: totalGross,
      platformFee: totalPlatformFee,
      net: totalNet,
      feePercentApplied: totalGross > 0 ? Math.round((totalPlatformFee / totalGross) * 10000) / 100 : 0,
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
    feeLabels,
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

export function statementFeePercentLabel(ctx: StatementClosingContext, payoutsByUnit?: Record<string, MonthlyPayout>): string {
  const umap = unitByIdMap(ctx.units);
  const unitIds = ctx.isAllUnits && payoutsByUnit
    ? Object.keys(payoutsByUnit)
    : [ctx.activeUnitId];
  const policy = ctx.policy;
  if (!payoutsByUnit || unitIds.length === 0) {
    const u = umap.get(ctx.activeUnitId);
    const d = resolveDailyFeePercentForUnit(u, policy);
    const c = resolveConnectFeePercentForUnit(u, policy);
    return `diárias ${d}% · planos ${c}%`;
  }
  const df = weightedDailyFeePercent(payoutsByUnit, unitIds, umap, policy);
  const cf = weightedConnectFeePercent(payoutsByUnit, unitIds, umap, policy);
  return `médias ponderadas: diárias ${df}% · planos ${cf}%`;
}
