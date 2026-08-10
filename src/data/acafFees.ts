import type { ConnectPlanId, StudentChannel } from '../types';
import { connectPlanById, getConnectFeePercent } from './connectDomain';

/** Taxa ACAF Connect (%). Preferir após carregar o domínio via API. */
export function acafConnectFeePercent(): number {
  return getConnectFeePercent();
}

/** Valor inicial; após login use `acafConnectFeePercent()` para o valor do admin. */
export const ACAF_CONNECT_FEE_PERCENT = 20;

/** @deprecated use ACAF_CONNECT_FEE_PERCENT */
export const ACAF_DAILY_FEE_PERCENT = ACAF_CONNECT_FEE_PERCENT;

export function acafFeeFromGross(gross: number): number {
  return gross * (getConnectFeePercent() / 100);
}

/** Valor líquido repassado à academia após taxa ACAF Connect. */
export function gymNetFromGross(gross: number): number {
  return gross * (1 - getConnectFeePercent() / 100);
}

/** Contribuição mensal da empresa por assíduo Connect (academia principal). */
export const CORPORATE_BENEFIT_PER_MONTH = 44.9;

/** Faixa de preço da diária configurável pela academia (R$). */
export const DAILY_PASS_STUDENT_MIN = 19;
export const DAILY_PASS_STUDENT_MAX = 59;

export function clampDailyPassStudentPrice(price: number): number {
  if (!Number.isFinite(price)) return DAILY_PASS_STUDENT_MIN;
  return Math.min(DAILY_PASS_STUDENT_MAX, Math.max(DAILY_PASS_STUDENT_MIN, price));
}

/** Arredonda preço de diária sem impor faixa fixa. */
export function roundDailyPassPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.round(price * 100) / 100;
}

/** Valor bruto de uma venda de diária (só o preço da diária; sem benefício corporativo). */
export function dailyPassTotalPerSale(dailyPrice: number): number {
  return roundDailyPassPrice(dailyPrice);
}

/** Taxa ACAF (20%) sobre o valor da diária. */
export function dailyPassAcafFee(dailyPrice: number): number {
  return acafFeeFromGross(dailyPassTotalPerSale(dailyPrice));
}

/** Repasse da academia (80%) sobre o valor da diária. */
export function dailyPassGymNet(dailyPrice: number): number {
  return gymNetFromGross(dailyPassTotalPerSale(dailyPrice));
}

export function connectPlanPrice(planId: ConnectPlanId): number {
  return connectPlanById(planId)?.pricePerMonth ?? 0;
}

/** Planos Connect: benefício corporativo mensal sempre somado. */
export function corporateBenefitForChannel(channel: StudentChannel): number {
  return channel === 'connect_primary' ? CORPORATE_BENEFIT_PER_MONTH : 0;
}

export function corporateBenefitForStudent(student: {
  channel: StudentChannel;
  corporateBenefitPerMonth?: number;
}): number {
  if (student.channel === 'connect_primary') {
    return CORPORATE_BENEFIT_PER_MONTH;
  }
  return student.corporateBenefitPerMonth ?? 0;
}

/** Total mensal (plano do aluno + benefício corporativo, quando houver). */
export function studentPlanTotalGross(planId: ConnectPlanId, corporateBenefitPerMonth = 0): number {
  return connectPlanPrice(planId) + corporateBenefitPerMonth;
}

/** Repasse mensal à academia por assíduo (80% do total visível ao parceiro). */
export function monthlyGymRepasseForStudentPlan(
  planId: ConnectPlanId,
  corporateBenefitPerMonth = 0,
): number {
  return gymNetFromGross(studentPlanTotalGross(planId, corporateBenefitPerMonth));
}

export function monthlyDailyPassGrossForStudent(
  dailyPassesThisMonth: number,
  studentDailyPrice: number,
): number {
  if (dailyPassesThisMonth <= 0) return 0;
  return dailyPassesThisMonth * dailyPassTotalPerSale(studentDailyPrice);
}

export function monthlyGymRepasseForDailyPass(
  dailyPassesThisMonth: number,
  studentDailyPrice: number,
): number {
  return gymNetFromGross(monthlyDailyPassGrossForStudent(dailyPassesThisMonth, studentDailyPrice));
}

/** Alias explícito: 20% ACAF sobre o total de cada diária, repasse 80%. */
export const DAILY_PASS_ACAF_FEE_PERCENT = ACAF_CONNECT_FEE_PERCENT;

export function formatFeeLabel(): string {
  return `Taxa ACAF Connect ${getConnectFeePercent()}%`;
}

export function formatGymShareLabel(): string {
  return `Repasse academia ${100 - getConnectFeePercent()}%`;
}
