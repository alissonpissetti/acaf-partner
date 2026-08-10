import type { ConnectPlanId } from '../types';

export type PartnerClientRelationship = 'primary' | 'daily_pass' | 'visitor' | 'mixed';

export type PartnerClientSummary = {
  holderKey: string;
  name: string;
  email?: string;
  cpf?: string;
  companyName?: string;
  connectPlanId?: ConnectPlanId;
  isPrimaryMember: boolean;
  primaryUnitId?: string;
  primaryUnitName?: string;
  primaryChosenAt?: string;
  connectSince?: string;
  totalCheckIns: number;
  checkInsThisMonth: number;
  dailyPassesTotal: number;
  dailyPassesThisMonth: number;
  lastVisit?: string;
  relationship: PartnerClientRelationship;
  dailyPassPricePaid?: number;
  corporateBenefitPerMonth?: number;
};

export type PartnerClientCheckIn = {
  id: string;
  unitId: string;
  unitName: string;
  type: 'daily_pass' | 'connect_member';
  validatedAt: string;
  code: string;
};

export type PartnerClientPrimaryHistory = {
  currentPrimaryUnitId?: string;
  currentPrimaryUnitName?: string;
  primaryChosenAt?: string;
  connectSince?: string;
  connectPlanId?: ConnectPlanId;
  connectPlanName?: string;
  primaryCheckInsSinceFirst?: number;
  changes: Array<{
    id: string;
    holderKey: string;
    fromUnitId: string | null;
    fromUnitName: string | null;
    toUnitId: string;
    toUnitName: string;
    changedAt: string;
  }>;
};

export type PartnerClientDetail = PartnerClientSummary & {
  checkIns: PartnerClientCheckIn[];
  primaryHistory: PartnerClientPrimaryHistory;
  studentRecords: Array<{
    id: string;
    unitId: string;
    name: string;
    email: string;
    channel: 'daily_pass' | 'connect_primary';
    connectPlanId?: ConnectPlanId;
    checkInsThisMonth: number;
    dailyPassesThisMonth: number;
    lastVisit: string;
    companyName?: string;
  }>;
};

export function clientCompanyLabel(client: PartnerClientSummary): string {
  return client.companyName?.trim() || '—';
}

export function relationshipLabel(relationship: PartnerClientRelationship): string {
  switch (relationship) {
    case 'primary':
      return 'Plano mensal (principal)';
    case 'daily_pass':
      return 'Diárias';
    case 'visitor':
      return 'Visitante Connect';
    case 'mixed':
      return 'Plano + diárias';
  }
}
