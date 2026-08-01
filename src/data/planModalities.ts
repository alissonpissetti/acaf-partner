import type { UnitPlanSpec } from '../types';

/** Mantém includedModalities alinhado ao que a unidade oferece. */
export function sanitizePlanSpecsModalities(
  unitModalities: string[],
  planSpecs: UnitPlanSpec[],
): UnitPlanSpec[] {
  return planSpecs.map((spec) => ({
    ...spec,
    includedModalities: spec.includedModalities.filter((m) =>
      unitModalities.some((u) => u.toLowerCase() === m.toLowerCase()),
    ),
  }));
}

/** Modalidades efetivas de um plano na unidade (respeita exactOnly e lista vazia = todas). */
export function effectivePlanModalities(spec: UnitPlanSpec, unitModalities: string[]): string[] {
  if (!spec.exactOnly && spec.includedModalities.length === 0) {
    return [...unitModalities];
  }
  return spec.includedModalities.filter((m) =>
    unitModalities.some((u) => u.toLowerCase() === m.toLowerCase()),
  );
}

export function planModalityChipOn(
  spec: UnitPlanSpec,
  modality: string,
  unitModalities: string[],
): boolean {
  if (!spec.exactOnly && spec.includedModalities.length === 0) {
    return unitModalities.some((u) => u.toLowerCase() === modality.toLowerCase());
  }
  return spec.includedModalities.some((m) => m.toLowerCase() === modality.toLowerCase());
}

export function togglePlanModalitySelection(
  spec: UnitPlanSpec,
  unitModalities: string[],
  modality: string,
): string[] {
  const base =
    spec.includedModalities.length > 0
      ? spec.includedModalities
      : spec.exactOnly
        ? []
        : [...unitModalities];
  const has = base.some((m) => m.toLowerCase() === modality.toLowerCase());
  if (has) {
    return base.filter((m) => m.toLowerCase() !== modality.toLowerCase());
  }
  return [...base, modality];
}
