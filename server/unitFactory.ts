import type { ApiStore, GymUnit, MonthlyPayout, UnitPlanSpec } from './types.js';

const CONNECT_PLAN_IDS = [
  'connect-start',
  'connect-plus',
  'connect-multi',
  'connect-pro',
  'connect-total',
] as const;

export function defaultPlanSpecs(): UnitPlanSpec[] {
  return CONNECT_PLAN_IDS.map((connectPlanId, i) => ({
    connectPlanId,
    enabled: i <= 2,
    includedModalities: [],
    exactOnly: false,
  }));
}

export function emptyMonthlyPayout(monthLabel: string): MonthlyPayout {
  return {
    monthLabel,
    dailyPassGross: 0,
    dailyPassNet: 0,
    connectRepasseTotal: 0,
    totalNet: 0,
    status: 'open',
    connectLines: [],
    recentDailySales: [],
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
}

export function generateUnitId(store: ApiStore, unitName: string, neighborhood: string): string {
  const netSlug = store.networkId.replace(/^net_/, '') || 'unit';
  const base = slugify(neighborhood || unitName) || 'nova';
  let id = `g_${netSlug}_${base}`;
  if (store.units.some((u) => u.id === id)) {
    id = `g_${netSlug}_${base}_${Date.now().toString(36).slice(-4)}`;
  }
  return id;
}

export type CreateUnitInput = {
  unitName: string;
  neighborhood: string;
  city: string;
  openHours?: string;
  description?: string;
};

export function buildNewUnit(store: ApiStore, input: CreateUnitInput): GymUnit {
  const unitName = input.unitName.trim();
  const neighborhood = input.neighborhood.trim();
  const city = input.city.trim();
  const id = generateUnitId(store, unitName, neighborhood);
  const modalities = ['Musculação', 'Funcional'];

  return {
    id,
    unitName,
    neighborhood,
    city,
    openHours: input.openHours?.trim() || 'Seg–Sex 6h–22h',
    description:
      input.description?.trim() ||
      `${unitName} · configure fotos, modalidades e planos no portal ACAF Connect.`,
    modalities,
    dailyPassPrice: 44.9,
    dailyPassActive: false,
    dailyPassNotes: 'Ative a diária após revisar preço e modalidades.',
    dailyPassModalities: [...modalities],
    planSpecs: defaultPlanSpecs(),
    heroPhotoDataUrl: null,
    galleryPhotoDataUrls: [],
    autoApproveCheckIn: false,
  };
}
