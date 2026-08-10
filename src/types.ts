import { getConnectPlans } from './data/connectDomain';
import type { UnitWeeklySchedule } from './data/weeklySchedule';

export const CONNECT_PLANS = [
  { id: 'connect-start', name: 'ACAF Start', pricePerMonth: 39.9, tierIndex: 0 },
  { id: 'connect-plus', name: 'ACAF Plus', pricePerMonth: 69.9, tierIndex: 1 },
  { id: 'connect-multi', name: 'ACAF Multi', pricePerMonth: 129.9, tierIndex: 2 },
  { id: 'connect-pro', name: 'ACAF Pro', pricePerMonth: 189.9, tierIndex: 3 },
  { id: 'connect-total', name: 'ACAF Total', pricePerMonth: 299.9, tierIndex: 4 },
] as const;

export type ConnectPlanId = string;

export const MODALITY_CATALOG = [
  'Musculação',
  'Natação',
  'Bike Indoor',
  'Hidroginástica',
  'Boxe',
  'Pilates',
  'Hatha Yoga',
  'Full Body',
  'Funcional',
  'FitDance',
] as const;

export type ModalitySlotTemplate = {
  id: string;
  modality: string;
  instructorName?: string;
  dayOfWeek: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string;
  endTime: string;
  capacity: number;
  active: boolean;
};

export type ModalitySlotOverride = {
  id: string;
  date: string;
  kind: 'cancel' | 'extra' | 'patch';
  slotTemplateId?: string;
  modality: string;
  instructorName?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
};

export type ModalityReservation = {
  id: string;
  unitId: string;
  occurrenceDate: string;
  slotTemplateId?: string;
  overrideId?: string;
  modality: string;
  instructorName?: string;
  startTime: string;
  endTime: string;
  holderName: string;
  holderUserId?: string;
  status: 'confirmed' | 'cancelled' | 'checked_in';
  reservedAt: string;
};

export const WEEKDAY_LABELS: Record<ModalitySlotTemplate['dayOfWeek'], string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const WEEKDAY_ORDER: ModalitySlotTemplate['dayOfWeek'][] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export type DailyPassPricingRule = {
  id: string;
  label?: string;
  daysOfWeek: ModalitySlotTemplate['dayOfWeek'][];
  startTime: string;
  endTime: string;
  modalities: string[];
  price: number;
  active: boolean;
};

export type UnitPlanSpec = {
  connectPlanId: ConnectPlanId;
  enabled: boolean;
  includedModalities: string[];
  exactOnly: boolean;
};

export type GymUnit = {
  id: string;
  unitName: string;
  zip?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state?: string;
  openHours: string;
  weeklySchedule?: UnitWeeklySchedule;
  description: string;
  modalities: string[];
  dailyPassPrice: number;
  dailyPassActive: boolean;
  dailyPassNotes: string;
  /** Subconjunto de [modalities] liberado na diária; vazio = todas as modalidades da unidade. */
  dailyPassModalities: string[];
  dailyPassPricingRules?: DailyPassPricingRule[];
  planSpecs: UnitPlanSpec[];
  heroPhotoDataUrl: string | null;
  galleryPhotoDataUrls: string[];
  autoApproveCheckIn?: boolean;
  modalitySlotTemplates?: ModalitySlotTemplate[];
  modalitySlotOverrides?: ModalitySlotOverride[];
  instructors?: string[];
};

/** @deprecated use GymUnit — kept for compatibility */
export type GymEstablishment = GymUnit & { networkName?: string };

export type StudentChannel = 'daily_pass' | 'connect_primary';

export type GymStudent = {
  id: string;
  unitId: string;
  name: string;
  email: string;
  channel: StudentChannel;
  connectPlanId?: ConnectPlanId;
  /** Valor mensal pago pela empresa empregadora (somado ao plano do aluno no repasse). */
  corporateBenefitPerMonth?: number;
  /** Nome fantasia da empresa empregadora (benefício corporativo). */
  companyName?: string;
  companySlug?: string;
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
  type: 'daily_pass' | 'connect_member';
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
  return getConnectPlans().find((p) => p.id === id)?.name ?? CONNECT_PLANS.find((p) => p.id === id)?.name ?? id;
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
