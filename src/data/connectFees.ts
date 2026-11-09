import type { ConnectPlanId, StudentChannel } from '../types';
import { connectPlanById, getConnectFeePercent, getDailyFeePercent } from './connectDomain';

/** Taxa global sobre planos (Configurações → `connectFeePercent`), antes de overrides por rede/unidade. */
export function domainConnectFeePercent(): number {
  return getConnectFeePercent();
}

/** Taxa global sobre diárias (Configurações → `dailyFeePercent` ou fallback ao connect). */
export function domainDailyFeePercent(): number {
  return getDailyFeePercent();
}

/**
 * @deprecated Preferir `domainConnectFeePercent()` ou `resolveConnectFeePercentForUnit` do contexto da rede.
 * Mantido: valor global do domínio (compatível com código antigo).
 */
export function connectFeePercent(): number {
  return getConnectFeePercent();
}

/** Constante só para bootstrap antes do `fetchDomain`; telas devem usar percentuais resolvidos. */
export const CONNECT_FEE_PERCENT = 20;

/** @deprecated use CONNECT_FEE_PERCENT */
export const DAILY_FEE_PERCENT = CONNECT_FEE_PERCENT;

export function platformFeeFromGross(gross: number, feePercent: number = connectFeePercent()): number {
  return gross * (feePercent / 100);
}

export function gymNetFromGross(gross: number, feePercent: number = connectFeePercent()): number {
  return gross * (1 - feePercent / 100);
}

/** Contribuição mensal da empresa por assíduo com plano (academia principal). */
export const CORPORATE_BENEFIT_PER_MONTH = 44.9;

/** Faixa de preço da diária configurável pela academia (R$). */
export const DAILY_PASS_STUDENT_MIN = 19;
export const DAILY_PASS_STUDENT_MAX = 59;

export function clampDailyPassStudentPrice(price: number): number {
  if (!Number.isFinite(price)) return DAILY_PASS_STUDENT_MIN;
  return Math.min(DAILY_PASS_STUDENT_MAX, Math.max(DAILY_PASS_STUDENT_MIN, price));
}

export function roundDailyPassPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.round(price * 100) / 100;
}

export function dailyPassTotalPerSale(dailyPrice: number): number {
  return roundDailyPassPrice(dailyPrice);
}

export function dailyPassPlatformFee(dailyPrice: number, dailyFeePercent: number): number {
  return platformFeeFromGross(dailyPassTotalPerSale(dailyPrice), dailyFeePercent);
}

export function dailyPassGymNet(dailyPrice: number, dailyFeePercent: number): number {
  return gymNetFromGross(dailyPassTotalPerSale(dailyPrice), dailyFeePercent);
}

export function connectPlanPrice(planId: ConnectPlanId): number {
  return connectPlanById(planId)?.pricePerMonth ?? 0;
}

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

export function studentPlanTotalGross(planId: ConnectPlanId, corporateBenefitPerMonth = 0): number {
  return connectPlanPrice(planId) + corporateBenefitPerMonth;
}

export function monthlyGymRepasseForStudentPlan(
  planId: ConnectPlanId,
  corporateBenefitPerMonth = 0,
  connectFeePercentValue: number = connectFeePercent(),
): number {
  return gymNetFromGross(studentPlanTotalGross(planId, corporateBenefitPerMonth), connectFeePercentValue);
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
  dailyFeePercent: number,
): number {
  return gymNetFromGross(
    monthlyDailyPassGrossForStudent(dailyPassesThisMonth, studentDailyPrice),
    dailyFeePercent,
  );
}

export function formatFeeLabel(percent: number): string {
  return `Taxa da plataforma ${percent}%`;
}

export function formatGymShareLabel(percent: number): string {
  return `Repasse academia ${100 - percent}%`;
}
