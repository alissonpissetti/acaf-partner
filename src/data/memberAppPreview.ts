import type { GymUnit } from '../types';
import { getConnectPlans } from './connectDomain';
import {
  formatDayRange,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  weeklyScheduleFromUnit,
} from './weeklySchedule';

/** Mesma regra do app (`Gym.unitLabel`). */
export function memberAppUnitLabel(unit: GymUnit): string {
  const name = unit.unitName.trim();
  if (name.includes('·')) {
    const tail = name.split('·').pop()?.trim();
    if (tail) return tail;
  }
  const hood = unit.neighborhood?.trim();
  if (hood) return hood;
  return name || 'Unidade';
}

export function memberAppGalleryPhotos(unit: GymUnit): string[] {
  const urls: string[] = [];
  if (unit.heroPhotoDataUrl) urls.push(unit.heroPhotoDataUrl);
  for (const url of unit.galleryPhotoDataUrls ?? []) {
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function memberAppHeroPhotoUrl(unit: GymUnit): string | null {
  return memberAppGalleryPhotos(unit)[0] ?? null;
}

export function enabledUnitPlans(unit: GymUnit) {
  const catalog = getConnectPlans();
  return (unit.planSpecs ?? [])
    .filter((s) => s.enabled)
    .map((s) => {
      const row = catalog.find((p) => p.id === s.connectPlanId);
      return row ? { ...row, modalities: s.includedModalities } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export function minDailyPassPriceForUnits(units: GymUnit[]): number | null {
  const prices = units
    .filter((u) => u.dailyPassActive && u.dailyPassPrice > 0)
    .map((u) => u.dailyPassPrice);
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function minPlanPriceForUnits(units: GymUnit[]): number | null {
  const catalog = getConnectPlans();
  const prices: number[] = [];
  for (const unit of units) {
    for (const spec of unit.planSpecs ?? []) {
      if (!spec.enabled) continue;
      const row = catalog.find((p) => p.id === spec.connectPlanId);
      if (row) prices.push(row.pricePerMonth);
    }
  }
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function memberAppOpenHoursRows(
  unit: GymUnit,
): { daysLabel: string; rangeLabel: string }[] {
  const schedule = weeklyScheduleFromUnit(unit);
  return WEEKDAY_ORDER.map((day) => ({
    daysLabel: WEEKDAY_LABELS[day],
    rangeLabel: formatDayRange(schedule[day]),
  }));
}

export function formatMemberAppPriceLine(
  unitCount: number,
  minDaily: number | null,
  minPlan: number | null,
): string | null {
  if (unitCount < 1 || minPlan == null) return null;
  const unitsLabel = `${unitCount} unidade${unitCount === 1 ? '' : 's'}`;
  const planPart = `planos a partir de R$ ${minPlan.toFixed(0)}/mês`;
  if (minDaily != null) {
    return `${unitsLabel} · a partir de R$ ${minDaily.toFixed(2)} diária · R$ ${minPlan.toFixed(0)}/mês`;
  }
  return `${unitsLabel} · ${planPart}`;
}