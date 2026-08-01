import type { ConnectPlanId, MonthlyPayout, StudentChannel, UnitPlanSpec, UnitScope } from '../types';

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
  autoApproveCheckIn?: boolean;
};

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

export type CheckInLogEntry = {
  id: string;
  unitId: string;
  code: string;
  type: 'daily_pass' | 'connect_member' | 'connect_visitor';
  holderName: string;
  validatedAt: string;
  receptionNote?: string;
};

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

export type ValidateCheckInResponse =
  | { ok: true; message: string; entry: CheckInLogEntry; portal: PortalPayload }
  | { ok: false; message: string };

const API_BASE = '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Não foi possível completar a operação.');
  }
  return res.json() as Promise<T>;
}

export async function fetchBootstrap(): Promise<import('../data/buildPortalView').PortalBootstrap> {
  return apiFetch('/api/bootstrap');
}

export async function patchActiveUnit(unitId: string): Promise<void> {
  await apiFetch('/api/portal/active-unit', {
    method: 'PATCH',
    body: JSON.stringify({ unitId }),
  });
}

export async function fetchPortal(scope: UnitScope = 'single'): Promise<PortalPayload> {
  return apiFetch(`/api/portal?scope=${scope}`);
}

export async function patchUnit(
  unitId: string,
  patch: Partial<GymUnit>,
  scope: UnitScope = 'single',
): Promise<PortalPayload> {
  return apiFetch(`/api/units/${unitId}?scope=${scope}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export type CreateUnitInput = {
  unitName: string;
  neighborhood: string;
  city: string;
  openHours?: string;
  description?: string;
};

export async function createUnit(
  input: CreateUnitInput,
  scope: UnitScope = 'single',
): Promise<PortalPayload> {
  return apiFetch(`/api/units?scope=${scope}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function validateCheckIn(
  unitId: string,
  code: string,
  scope: UnitScope = 'single',
): Promise<ValidateCheckInResponse> {
  const res = await fetch('/api/check-ins/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId, code, scope }),
  });
  const data = (await res.json()) as ValidateCheckInResponse & { message?: string };
  if (!res.ok) {
    return { ok: false, message: data.message ?? 'Código recusado' };
  }
  return data;
}

export type PendingCheckInRequest = {
  id: string;
  unitId: string;
  holderName: string;
  code: string;
  type: CheckInLogEntry['type'];
  requestedAt: string;
  status: 'pending' | 'dismissed';
};

export async function fetchPendingCheckIns(
  unitId: string,
  scope: UnitScope = 'single',
): Promise<{ pending: PendingCheckInRequest[]; approvedCount: number; portal?: PortalPayload }> {
  return apiFetch(`/api/check-ins/pending?unitId=${encodeURIComponent(unitId)}&scope=${scope}`);
}

export async function approvePendingCheckIn(
  pendingId: string,
  unitId: string,
  scope: UnitScope = 'single',
): Promise<{ ok: true; message: string; portal: PortalPayload } | { ok: false; message: string }> {
  const res = await fetch(`/api/check-ins/pending/${pendingId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId, scope }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string; portal?: PortalPayload };
  if (!res.ok) return { ok: false, message: data.message ?? 'Não foi possível liberar.' };
  return { ok: true, message: data.message ?? 'Entrada liberada.', portal: data.portal! };
}

export async function dismissPendingCheckIn(
  pendingId: string,
  unitId: string,
  scope: UnitScope = 'single',
): Promise<PortalPayload> {
  const data = await apiFetch<{ portal: PortalPayload }>(`/api/check-ins/pending/${pendingId}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ unitId, scope }),
  });
  return data.portal;
}

export async function fetchDemoCodes(unitId: string): Promise<{ memberToday: string; dailyDemo: string }> {
  return apiFetch(`/api/check-ins/demo-code?unitId=${encodeURIComponent(unitId)}`);
}

export async function fetchDomain(): Promise<unknown> {
  return apiFetch('/api/domain');
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

export function activeUnit(payload: PortalPayload): GymUnit {
  return payload.units.find((u) => u.id === payload.activeUnitId) ?? payload.units[0];
}
