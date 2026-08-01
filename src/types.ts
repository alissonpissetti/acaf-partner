export const CONNECT_PLANS = [
  { id: 'connect-start', name: 'ACAF Start', pricePerMonth: 39.9, tierIndex: 0 },
  { id: 'connect-plus', name: 'ACAF Plus', pricePerMonth: 69.9, tierIndex: 1 },
  { id: 'connect-multi', name: 'ACAF Multi', pricePerMonth: 129.9, tierIndex: 2 },
  { id: 'connect-pro', name: 'ACAF Pro', pricePerMonth: 189.9, tierIndex: 3 },
  { id: 'connect-total', name: 'ACAF Total', pricePerMonth: 299.9, tierIndex: 4 },
] as const;

export type ConnectPlanId = (typeof CONNECT_PLANS)[number]['id'];

export const MODALITY_CATALOG = [
  'Musculação',
  'Cardio',
  'Funcional',
  'HIIT',
  'Cross Training',
  'Yoga',
  'Pilates',
  'Natação',
  'Hidroginástica',
  'Aulas em grupo',
  'Personal',
] as const;

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
  /** Subconjunto de [modalities] liberado na diária; vazio = todas as modalidades da unidade. */
  dailyPassModalities: string[];
  planSpecs: UnitPlanSpec[];
  heroPhotoDataUrl: string | null;
  galleryPhotoDataUrls: string[];
  autoApproveCheckIn?: boolean;
};

/** @deprecated use GymUnit — kept for compatibility */
export type GymEstablishment = GymUnit & { networkName?: string };

export type StudentChannel = 'daily_pass' | 'connect_primary' | 'connect_visitor';

export type GymStudent = {
  id: string;
  unitId: string;
  name: string;
  email: string;
  channel: StudentChannel;
  connectPlanId?: ConnectPlanId;
  /** Valor mensal pago pela empresa empregadora (somado ao plano do aluno no repasse). */
  corporateBenefitPerMonth?: number;
  checkInsThisMonth: number;
  lastVisit: string;
  dailyPassesThisMonth: number;
  /** Preço pago em cada diária (R$ 19–59); se omitido, usa preço da unidade. */
  dailyPassPricePaid?: number;
};

export type CheckInLogEntry = {
  id: string;
  unitId: string;
  code: string;
  type: 'daily_pass' | 'connect_member' | 'connect_visitor';
  holderName: string;
  validatedAt: string;
};

export type DailyPassSale = {
  id: string;
  date: string;
  studentName: string;
  gross: number;
  feePercent: number;
  net: number;
};

export type MonthlyPayoutLine = {
  connectPlanId: ConnectPlanId;
  activeMembers: number;
  checkIns: number;
  repasseAmount: number;
};

export type MonthlyPayout = {
  monthLabel: string;
  dailyPassGross: number;
  dailyPassNet: number;
  connectRepasseTotal: number;
  totalNet: number;
  status: 'open' | 'processing' | 'paid';
  paidAt?: string;
  connectLines: MonthlyPayoutLine[];
  recentDailySales: DailyPassSale[];
};

export { ACAF_CONNECT_FEE_PERCENT, ACAF_DAILY_FEE_PERCENT, gymNetFromGross, acafFeeFromGross } from './data/acafFees';

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function connectPlanName(id: ConnectPlanId): string {
  return CONNECT_PLANS.find((p) => p.id === id)?.name ?? id;
}

export type UnitScope = 'single' | 'all';

export type PortalViewState = {
  loggedIn: boolean;
  apiOnline: boolean;
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
