export type ConnectPlanId =
  | 'connect-start'
  | 'connect-plus'
  | 'connect-multi'
  | 'connect-pro'
  | 'connect-total';

export type UnitPlanSpec = {
  connectPlanId: ConnectPlanId;
  enabled: boolean;
  includedModalities: string[];
  exactOnly: boolean;
};

export type GymUnit = {
  id: string;
  unitName: string;
  neighborhood: string;
  city: string;
  openHours: string;
  description: string;
  modalities: string[];
  dailyPassPrice: number;
  dailyPassActive: boolean;
  dailyPassNotes: string;
  dailyPassModalities: string[];
  planSpecs: UnitPlanSpec[];
  heroPhotoDataUrl: string | null;
  galleryPhotoDataUrls: string[];
  /** Libera check-ins solicitados pelo app sem confirmação manual na recepção. */
  autoApproveCheckIn?: boolean;
};

export type StudentChannel = 'daily_pass' | 'connect_primary';

export type GymStudent = {
  id: string;
  unitId: string;
  name: string;
  email: string;
  channel: StudentChannel;
  connectPlanId?: ConnectPlanId;
  corporateBenefitPerMonth?: number;
  checkInsThisMonth: number;
  lastVisit: string;
  dailyPassesThisMonth: number;
  dailyPassPricePaid?: number;
};

export type IssuedCheckInCode = {
  code: string;
  type: 'daily_pass' | 'connect_member';
  unitId: string;
  holderName: string;
  validUntil: string;
};

export type CheckInLogEntry = {
  id: string;
  unitId: string;
  code: string;
  type: 'daily_pass' | 'connect_member';
  holderName: string;
  validatedAt: string;
  receptionNote?: string;
};

export type MonthlyPayout = {
  monthLabel: string;
  dailyPassGross: number;
  dailyPassNet: number;
  connectRepasseTotal: number;
  totalNet: number;
  status: 'open' | 'processing' | 'paid';
  paidAt?: string;
  connectLines: {
    connectPlanId: ConnectPlanId;
    activeMembers: number;
    checkIns: number;
    repasseAmount: number;
  }[];
  recentDailySales: {
    id: string;
    date: string;
    studentName: string;
    gross: number;
    feePercent: number;
    net: number;
  }[];
};

export type ApiStore = {
  networkId: string;
  networkName: string;
  activeUnitId: string;
  units: GymUnit[];
  students: GymStudent[];
  payoutsByUnit: Record<string, MonthlyPayout>;
  /** Últimos meses por unidade (mais antigo → mais recente). */
  payoutHistoryByUnit: Record<string, MonthlyPayout[]>;
  issuedCodes: IssuedCheckInCode[];
  checkInLog: CheckInLogEntry[];
  pendingCheckIns: PendingCheckInRequest[];
};

import { buildDemoStore } from './demoSeed.js';
import { aggregatePayouts, type UnitScope } from './aggregatePayout.js';
import { recentCheckInsForPortal } from './checkInLog.js';
import type { PendingCheckInRequest } from './pendingCheckIn.js';

export function createInitialStore(): ApiStore {
  return buildDemoStore();
}

export type { UnitScope };

export type PortalPayload = {
  loggedIn: boolean;
  networkId: string;
  networkName: string;
  activeUnitId: string;
  unitScope: UnitScope;
  units: GymUnit[];
  students: GymStudent[];
  payout: MonthlyPayout;
  payoutsByUnit: Record<string, MonthlyPayout>;
  payoutHistoryByUnit: Record<string, MonthlyPayout[]>;
  checkInLog: CheckInLogEntry[];
};

export function portalPayloadFromStore(
  store: ApiStore,
  loggedIn: boolean,
  unitScope: UnitScope = 'single',
): PortalPayload {
  const payoutsByUnit = store.payoutsByUnit;
  const payoutHistoryByUnit = store.payoutHistoryByUnit ?? {};

  if (unitScope === 'all') {
    return {
      loggedIn,
      networkId: store.networkId,
      networkName: store.networkName,
      activeUnitId: store.activeUnitId,
      unitScope: 'all',
      units: store.units,
      students: store.students,
      payout: aggregatePayouts(payoutsByUnit),
      payoutsByUnit,
      payoutHistoryByUnit,
      checkInLog: recentCheckInsForPortal(store.checkInLog, undefined, 80),
    };
  }

  const payout =
    payoutsByUnit[store.activeUnitId] ??
    Object.values(payoutsByUnit)[0] ??
    aggregatePayouts(payoutsByUnit);
  const students = store.students.filter((s) => s.unitId === store.activeUnitId);
  const checkInLog = recentCheckInsForPortal(store.checkInLog, store.activeUnitId, 50);

  return {
    loggedIn,
    networkId: store.networkId,
    networkName: store.networkName,
    activeUnitId: store.activeUnitId,
    unitScope: 'single',
    units: store.units,
    students,
    payout,
    payoutsByUnit,
    payoutHistoryByUnit,
    checkInLog,
  };
}
