import type { ConnectPlanId, GymStudent, MonthlyPayout } from '../types';
import {
  CORPORATE_BENEFIT_PER_MONTH,
  corporateBenefitForStudent,
  gymNetFromGross,
  studentPlanTotalGross,
} from './acafFees';
import { connectPlansGross, payoutGrossSummary } from './payoutGross';

const CONNECT_PLAN_ORDER: ConnectPlanId[] = [
  'connect-start',
  'connect-plus',
  'connect-multi',
  'connect-pro',
  'connect-total',
];

/** Assinantes com academia principal nesta unidade (repasse mensal previsto). */
export function primaryConnectStudents(students: GymStudent[], unitIds: string[]): GymStudent[] {
  return students.filter(
    (s) =>
      unitIds.includes(s.unitId) &&
      s.channel === 'connect_primary' &&
      s.connectPlanId,
  );
}

export function connectGrossFromPrimaryStudents(
  students: GymStudent[],
  unitIds: string[],
): { members: number; gross: number } {
  const scoped = primaryConnectStudents(students, unitIds);
  const gross = scoped.reduce(
    (sum, s) =>
      sum + studentPlanTotalGross(s.connectPlanId!, corporateBenefitForStudent(s)),
    0,
  );
  return { members: scoped.length, gross: Math.round(gross * 100) / 100 };
}

/** Linhas de plano para extrato/previsão quando o mês em aberto ainda não fechou Connect. */
export function buildConnectLinesFromPrimaryStudents(
  students: GymStudent[],
  unitIds: string[],
): MonthlyPayout['connectLines'] {
  const scoped = primaryConnectStudents(students, unitIds);
  return CONNECT_PLAN_ORDER
    .map((planId) => {
      const group = scoped.filter((s) => s.connectPlanId === planId);
      if (!group.length) return null;
      const activeMembers = group.length;
      const planGross = activeMembers * studentPlanTotalGross(planId, CORPORATE_BENEFIT_PER_MONTH);
      return {
        connectPlanId: planId,
        activeMembers,
        checkIns: group.reduce((sum, s) => sum + (s.checkInsThisMonth ?? 1), 0),
        repasseAmount: gymNetFromGross(planGross),
      };
    })
    .filter((line): line is MonthlyPayout['connectLines'][number] => line != null);
}

function applyConnectLinesToPayout(
  payout: MonthlyPayout,
  lines: MonthlyPayout['connectLines'],
): MonthlyPayout {
  if (!lines.length) return payout;

  const connectGross = lines.reduce(
    (sum, line) =>
      sum + studentPlanTotalGross(line.connectPlanId, CORPORATE_BENEFIT_PER_MONTH) * line.activeMembers,
    0,
  );
  const connectRepasseTotal = gymNetFromGross(connectGross);

  return {
    ...payout,
    connectLines: lines.map((line) => ({ ...line })),
    connectRepasseTotal,
    totalNet: Math.round((payout.dailyPassNet + connectRepasseTotal) * 100) / 100,
  };
}

/** Preenche planos previstos em meses em aberto sem linhas Connect (repasse garantido). */
export function withProjectedConnectIfOpen(
  payout: MonthlyPayout,
  students: GymStudent[],
  unitIds: string[],
  fallbackPayout?: MonthlyPayout,
): MonthlyPayout {
  if (payout.status === 'paid') return payout;
  if (connectPlansGross(payout) > 0) return payout;

  const linesFromStudents = buildConnectLinesFromPrimaryStudents(students, unitIds);
  if (linesFromStudents.length) {
    return applyConnectLinesToPayout(payout, linesFromStudents);
  }

  if (fallbackPayout?.connectLines.length) {
    return applyConnectLinesToPayout(payout, fallbackPayout.connectLines);
  }

  return payout;
}

export function openMonthNeedsConnectProjection(
  payout: MonthlyPayout,
  students: GymStudent[],
  unitIds: string[],
): boolean {
  if (payout.status === 'paid') return false;
  if (connectPlansGross(payout) > 0) return false;
  return connectGrossFromPrimaryStudents(students, unitIds).members > 0;
}

export function projectedConnectGrossForOpenMonth(
  payout: MonthlyPayout,
  students: GymStudent[],
  unitIds: string[],
): number {
  const enriched = withProjectedConnectIfOpen(payout, students, unitIds);
  return payoutGrossSummary(enriched).connectGross;
}
