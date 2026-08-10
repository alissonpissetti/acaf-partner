import { sanitizeDailyPassModalities } from './dailyPassModalities';
import { sanitizePlanSpecsModalities } from './planModalities';
import type { GymUnit, ModalitySlotOverride, ModalitySlotTemplate } from '../types';

function sanitizeModalitySchedule(
  nextModalities: string[],
  templates: ModalitySlotTemplate[] = [],
  overrides: ModalitySlotOverride[] = [],
) {
  const allowed = (m: string) =>
    nextModalities.some((u) => u.toLowerCase() === m.toLowerCase());
  return {
    modalitySlotTemplates: templates.filter((t) => allowed(t.modality)),
    modalitySlotOverrides: overrides.filter((o) => allowed(o.modality)),
  };
}

/** Ao alterar modalidades da unidade, limpa diária e planos que referenciavam itens removidos. */
export function patchUnitModalities(unit: GymUnit, nextModalities: string[]): Partial<GymUnit> {
  const schedule = sanitizeModalitySchedule(
    nextModalities,
    unit.modalitySlotTemplates,
    unit.modalitySlotOverrides,
  );
  return {
    modalities: nextModalities,
    dailyPassModalities: sanitizeDailyPassModalities(
      nextModalities,
      unit.dailyPassModalities ?? [],
    ),
    planSpecs: sanitizePlanSpecsModalities(nextModalities, unit.planSpecs),
    ...schedule,
  };
}
