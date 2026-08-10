import type {
  ConnectPlanId,
  ModalityReservation,
  ModalitySlotOverride,
  ModalitySlotTemplate,
  MonthlyPayout,
  StudentChannel,
  UnitPlanSpec,
  UnitScope,
} from '../types';
import { clearPartnerSession, getPartnerToken } from './auth';
import { apiUrl, parseApiError } from './http';

import type { UnitWeeklySchedule } from '../data/weeklySchedule';

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
  type: 'daily_pass' | 'connect_member';
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

function authHeaders(): Record<string, string> {
  const token = getPartnerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    clearPartnerSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível completar a operação.'));
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

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (res.status === 401) {
    clearPartnerSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível enviar a foto.'));
  }
  return res.json() as Promise<T>;
}

export async function uploadUnitHeroPhoto(unitId: string, file: File): Promise<GymUnit> {
  const formData = new FormData();
  formData.append('photo', file);
  return apiUpload(`/api/units/${unitId}/photos/hero`, formData);
}

export async function uploadUnitGalleryPhotos(unitId: string, files: File[]): Promise<GymUnit> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }
  return apiUpload(`/api/units/${unitId}/photos/gallery`, formData);
}

export async function removeUnitHeroPhoto(unitId: string): Promise<GymUnit> {
  return apiFetch(`/api/units/${unitId}/photos/hero`, { method: 'DELETE' });
}

export async function setUnitHeroFromGallery(unitId: string, galleryIndex: number): Promise<GymUnit> {
  return apiFetch(`/api/units/${unitId}/photos/hero`, {
    method: 'PATCH',
    body: JSON.stringify({ galleryIndex }),
  });
}

export async function removeUnitGalleryPhoto(unitId: string, index: number): Promise<GymUnit> {
  return apiFetch(`/api/units/${unitId}/photos/gallery/${index}`, { method: 'DELETE' });
}

export function unitPatchWithoutPhotos(unit: GymUnit): Partial<GymUnit> {
  const { heroPhotoDataUrl: _hero, galleryPhotoDataUrls: _gallery, ...rest } = unit;
  return rest;
}

export type CepLookupResult = {
  zip: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  uf: string;
};

export async function lookupZip(zip: string): Promise<CepLookupResult> {
  const digits = zip.replace(/\D/g, '');
  return apiFetch(`/api/addresses/zip/${digits}`);
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
  const res = await fetch(apiUrl('/api/check-ins/validate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
  const res = await fetch(apiUrl(`/api/check-ins/pending/${pendingId}/approve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

import type { ConnectDomain } from '../data/connectDomain';
import type { PartnerClientDetail, PartnerClientSummary } from '../data/partnerClients';

export async function fetchDomain(): Promise<ConnectDomain> {
  return apiFetch('/api/domain');
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/health'));
    return res.ok;
  } catch {
    return false;
  }
}

export type ModalitySlotsPayload = {
  templates: ModalitySlotTemplate[];
  overrides: ModalitySlotOverride[];
  scheduledModalities: string[];
  instructors: string[];
};

export async function fetchModalitySlots(unitId: string): Promise<ModalitySlotsPayload> {
  return apiFetch(`/api/units/${unitId}/modality-slots`);
}

export async function saveModalitySlots(
  unitId: string,
  templates: ModalitySlotTemplate[],
  instructors?: string[],
): Promise<ModalitySlotsPayload> {
  return apiFetch(`/api/units/${unitId}/modality-slots`, {
    method: 'PUT',
    body: JSON.stringify({ templates, instructors }),
  });
}

export async function saveModalitySlotOverrides(
  unitId: string,
  overrides: ModalitySlotOverride[],
): Promise<ModalitySlotsPayload> {
  return apiFetch(`/api/units/${unitId}/modality-slot-overrides`, {
    method: 'PUT',
    body: JSON.stringify({ overrides }),
  });
}

export async function fetchModalityReservations(
  unitId: string,
  date: string,
): Promise<{ date: string; reservations: ModalityReservation[] }> {
  return apiFetch(
    `/api/units/${unitId}/modality-reservations?date=${encodeURIComponent(date)}`,
  );
}

export async function fetchModalityReservationsRange(
  unitId: string,
  from: string,
  to: string,
): Promise<{ from: string; to: string; reservations: ModalityReservation[] }> {
  return apiFetch(
    `/api/units/${unitId}/modality-reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export async function fetchPartnerClients(scope: UnitScope = 'single'): Promise<PartnerClientSummary[]> {
  const data = await apiFetch<{ clients: PartnerClientSummary[] }>(`/api/clients?scope=${scope}`);
  return data.clients;
}

export async function fetchPartnerClientDetail(
  holderKey: string,
  scope: UnitScope = 'single',
): Promise<PartnerClientDetail> {
  const encoded = encodeURIComponent(holderKey);
  const data = await apiFetch<{ client: PartnerClientDetail }>(
    `/api/clients/${encoded}?scope=${scope}`,
  );
  return data.client;
}

export function activeUnit(payload: PortalPayload): GymUnit {
  return payload.units.find((u) => u.id === payload.activeUnitId) ?? payload.units[0];
}
