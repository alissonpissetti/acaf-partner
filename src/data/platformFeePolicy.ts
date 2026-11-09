import type { GymUnit } from '../types';

/** Valores efetivos vindos do portal (padrão global + overrides da rede). */
export type PortalFeePolicy = {
  defaultConnectFeePercent: number;
  defaultDailyFeePercent: number;
  networkConnectFeePercentOverride: number | null;
  networkDailyFeePercentOverride: number | null;
};

export function portalFeePolicyFromView(view: import('../types').PortalViewState): PortalFeePolicy {
  return {
    defaultConnectFeePercent: view.defaultConnectFeePercent,
    defaultDailyFeePercent: view.defaultDailyFeePercent,
    networkConnectFeePercentOverride: view.networkConnectFeePercentOverride,
    networkDailyFeePercentOverride: view.networkDailyFeePercentOverride,
  };
}

function clampFeePercent(n: number): number {
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(0, n));
}

/**
 * Hierarquia: override da unidade → override da rede → % padrão global (Configurações).
 */
export function resolveConnectFeePercentForUnit(
  unit: GymUnit | undefined,
  policy: PortalFeePolicy,
): number {
  if (
    unit?.connectFeePercentOverride != null &&
    Number.isFinite(unit.connectFeePercentOverride)
  ) {
    return clampFeePercent(unit.connectFeePercentOverride);
  }
  if (
    policy.networkConnectFeePercentOverride != null &&
    Number.isFinite(policy.networkConnectFeePercentOverride)
  ) {
    return clampFeePercent(policy.networkConnectFeePercentOverride);
  }
  return clampFeePercent(policy.defaultConnectFeePercent);
}

export function resolveDailyFeePercentForUnit(
  unit: GymUnit | undefined,
  policy: PortalFeePolicy,
): number {
  if (
    unit?.dailyFeePercentOverride != null &&
    Number.isFinite(unit.dailyFeePercentOverride)
  ) {
    return clampFeePercent(unit.dailyFeePercentOverride);
  }
  if (
    policy.networkDailyFeePercentOverride != null &&
    Number.isFinite(policy.networkDailyFeePercentOverride)
  ) {
    return clampFeePercent(policy.networkDailyFeePercentOverride);
  }
  return clampFeePercent(policy.defaultDailyFeePercent);
}

export function blendedFeeRateFromParts(
  dailyGross: number,
  connectGross: number,
  dailyFeePercent: number,
  connectFeePercent: number,
): number {
  const total = dailyGross + connectGross;
  if (total <= 0) return connectFeePercent;
  return (
    (dailyGross * dailyFeePercent + connectGross * connectFeePercent) / total
  );
}
