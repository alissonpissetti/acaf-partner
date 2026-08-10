import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import domain from '../shared/connect_domain.json';
import { createInitialStore, type ApiStore, type GymUnit } from './types.js';
import { buildPayoutHistoryByUnit, buildCurrentPayoutsByUnit, demoPendingCheckIns } from './demoSeed.js';

const CORPORATE_BENEFIT_PER_MONTH = 44.9;

function clampDailyStudentPrice(price: number): number {
  return Math.min(59, Math.max(19, price));
}

function normalizeUnit(unit: GymUnit): GymUnit {
  const dailyPassModalities =
    unit.dailyPassModalities && unit.dailyPassModalities.length > 0
      ? unit.dailyPassModalities.filter((m) => unit.modalities.includes(m))
      : [...unit.modalities];
  const planSpecs = unit.planSpecs.map((spec) => ({
    ...spec,
    includedModalities: spec.includedModalities.filter((m) =>
      unit.modalities.some((u) => u.toLowerCase() === m.toLowerCase()),
    ),
  }));
  return {
    ...unit,
    dailyPassModalities,
    planSpecs,
    autoApproveCheckIn: unit.autoApproveCheckIn ?? false,
    dailyPassPrice: clampDailyStudentPrice(unit.dailyPassPrice),
  };
}

function normalizeStore(store: ApiStore): ApiStore {
  store.units = store.units.map(normalizeUnit);
  store.students = store.students.map((s) => {
    let next = s;
    if (s.channel === 'connect_primary') {
      next = { ...next, corporateBenefitPerMonth: CORPORATE_BENEFIT_PER_MONTH };
    }
    if (s.channel === 'daily_pass') {
      const unit = store.units.find((u) => u.id === s.unitId);
      const paid = clampDailyStudentPrice(s.dailyPassPricePaid ?? unit?.dailyPassPrice ?? 39.9);
      next = { ...next, dailyPassPricePaid: paid };
    }
    return next;
  });
  if (!Array.isArray(store.pendingCheckIns)) {
    store.pendingCheckIns = demoPendingCheckIns().filter((p) =>
      store.units.some((u) => u.id === p.unitId),
    );
  }
  if (!store.payoutHistoryByUnit || Object.keys(store.payoutHistoryByUnit).length === 0) {
    store.payoutHistoryByUnit = buildPayoutHistoryByUnit();
    store.payoutsByUnit = buildCurrentPayoutsByUnit(store.payoutHistoryByUnit);
  }
  for (const unit of store.units) {
    if (!store.payoutsByUnit[unit.id]) {
      const hist = store.payoutHistoryByUnit[unit.id];
      if (hist?.length) store.payoutsByUnit[unit.id] = hist[hist.length - 1]!;
    }
    if (!store.payoutHistoryByUnit[unit.id]) {
      store.payoutHistoryByUnit[unit.id] = [store.payoutsByUnit[unit.id]].filter(Boolean) as ApiStore['payoutHistoryByUnit'][string];
    }
  }
  return store;
}

const __dir = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(__dir, 'data', 'store.json');

let cache: ApiStore | null = null;

export function getDomain() {
  return domain;
}

export function loadStore(): ApiStore {
  if (cache) return cache;
  if (existsSync(STORE_PATH)) {
    const raw = readFileSync(STORE_PATH, 'utf-8');
    cache = normalizeStore(JSON.parse(raw) as ApiStore);
    return cache;
  }
  cache = createInitialStore();
  saveStore(cache);
  return cache;
}

export function saveStore(store: ApiStore) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  cache = store;
}

export function updateStore(mutator: (draft: ApiStore) => void): ApiStore {
  const store = structuredClone(loadStore());
  mutator(store);
  saveStore(store);
  return store;
}
