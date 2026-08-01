import { sanitizeDailyPassModalities } from './dailyPassModalities';
import { sanitizePlanSpecsModalities } from './planModalities';
import type { GymUnit } from '../types';

/** Ao alterar modalidades da unidade, limpa diária e planos que referenciavam itens removidos. */
export function patchUnitModalities(unit: GymUnit, nextModalities: string[]): Partial<GymUnit> {
  return {
    modalities: nextModalities,
    dailyPassModalities: sanitizeDailyPassModalities(
      nextModalities,
      unit.dailyPassModalities ?? [],
    ),
    planSpecs: sanitizePlanSpecsModalities(nextModalities, unit.planSpecs),
  };
}
