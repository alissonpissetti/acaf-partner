import type { ApiStore, CheckInLogEntry } from './types.js';
import { applySuccessfulCheckIn, validateCheckInCode } from './checkIn.js';

export type PendingCheckInRequest = {
  id: string;
  unitId: string;
  holderName: string;
  code: string;
  type: CheckInLogEntry['type'];
  requestedAt: string;
  status: 'pending' | 'dismissed';
};

export function approvePendingCheckIn(
  store: ApiStore,
  pendingId: string,
  unitId: string,
): { ok: true; message: string } | { ok: false; message: string } {
  const pending = store.pendingCheckIns.find((p) => p.id === pendingId && p.unitId === unitId);
  if (!pending || pending.status !== 'pending') {
    return { ok: false, message: 'Solicitação não encontrada ou já tratada.' };
  }

  const result = validateCheckInCode(store, unitId, pending.code);
  if (!result.ok) {
    store.pendingCheckIns = store.pendingCheckIns.filter((p) => p.id !== pendingId);
    return { ok: false, message: result.message };
  }

  applySuccessfulCheckIn(store, unitId, result, pending.code);
  store.pendingCheckIns = store.pendingCheckIns.filter((p) => p.id !== pendingId);
  return { ok: true, message: result.message };
}

export function dismissPendingCheckIn(store: ApiStore, pendingId: string, unitId: string): boolean {
  const before = store.pendingCheckIns.length;
  store.pendingCheckIns = store.pendingCheckIns.filter(
    (p) => !(p.id === pendingId && p.unitId === unitId && p.status === 'pending'),
  );
  return store.pendingCheckIns.length < before;
}

export function processAutoApproveForUnit(store: ApiStore, unitId: string): number {
  const unit = store.units.find((u) => u.id === unitId);
  if (!unit?.autoApproveCheckIn) return 0;

  let approved = 0;
  const queue = store.pendingCheckIns.filter((p) => p.unitId === unitId && p.status === 'pending');
  for (const item of queue) {
    const out = approvePendingCheckIn(store, item.id, unitId);
    if (out.ok) approved += 1;
  }
  return approved;
}

export function pendingForUnit(store: ApiStore, unitId: string): PendingCheckInRequest[] {
  return store.pendingCheckIns
    .filter((p) => p.unitId === unitId && p.status === 'pending')
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}
