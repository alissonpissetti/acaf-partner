import type { UnitPlanSpec } from '../types';
import { CONNECT_PLANS as FALLBACK_CONNECT_PLANS, MODALITY_CATALOG as FALLBACK_MODALITY_CATALOG } from '../types';
import { sortModalitiesAlphabetically } from './modalitySort';

export type ConnectDomainPlan = {
  id: string;
  name: string;
  pricePerMonth: number;
  tierIndex: number;
  description?: string;
};

export type ConnectDomain = {
  schemaVersion?: number;
  acafConnectFeePercent?: number;
  acafDailyFeePercent?: number;
  connectPlans?: ConnectDomainPlan[];
  modalityCatalog?: string[];
};

function clonePlans(plans: readonly { id: string; name: string; pricePerMonth: number; tierIndex: number; description?: string }[]): ConnectDomainPlan[] {
  return plans.map((plan) => ({ ...plan }));
}

let domainState: ConnectDomain = {
  acafConnectFeePercent: 20,
  acafDailyFeePercent: 20,
  connectPlans: clonePlans(FALLBACK_CONNECT_PLANS),
};

export function setConnectDomain(domain: ConnectDomain): void {
  const plans = domain.connectPlans?.length ? domain.connectPlans : clonePlans(FALLBACK_CONNECT_PLANS);
  domainState = {
    ...domain,
    connectPlans: [...plans].sort((a, b) => (a.tierIndex ?? 0) - (b.tierIndex ?? 0)),
    modalityCatalog: domain.modalityCatalog?.length ? [...domain.modalityCatalog] : domainState.modalityCatalog,
  };
}

export function getConnectDomain(): ConnectDomain {
  return domainState;
}

export function getConnectPlans(): ConnectDomainPlan[] {
  return [...(domainState.connectPlans ?? clonePlans(FALLBACK_CONNECT_PLANS))];
}

export function getConnectFeePercent(): number {
  return domainState.acafConnectFeePercent ?? 20;
}

export function getModalityCatalog(): string[] {
  const catalog = domainState.modalityCatalog;
  if (catalog?.length) return sortModalitiesAlphabetically(catalog);
  return sortModalitiesAlphabetically(FALLBACK_MODALITY_CATALOG);
}

export function connectPlanById(id: string): ConnectDomainPlan | undefined {
  return getConnectPlans().find((plan) => plan.id === id);
}

export function mergeUnitPlanSpecs(
  saved: UnitPlanSpec[] | undefined,
): UnitPlanSpec[] {
  return getConnectPlans().map((plan, index) => {
    const found = saved?.find((spec) => spec.connectPlanId === plan.id);
    return (
      found ?? {
        connectPlanId: plan.id,
        enabled: index <= 2,
        includedModalities: [],
        exactOnly: false,
      }
    );
  });
}
