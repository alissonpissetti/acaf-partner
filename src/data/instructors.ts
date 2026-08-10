import type { ModalitySlotOverride, ModalitySlotTemplate } from '../types';

export function sortInstructorNames(names: string[]): string[] {
  return [...names]
    .map((n) => n.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

export function collectInstructorNames(
  templates: ModalitySlotTemplate[],
  overrides: ModalitySlotOverride[],
  existing: string[] = [],
): string[] {
  const set = new Set(sortInstructorNames(existing));
  for (const row of templates) {
    const name = row.instructorName?.trim();
    if (name) set.add(name);
  }
  for (const row of overrides) {
    const name = row.instructorName?.trim();
    if (name) set.add(name);
  }
  return sortInstructorNames([...set]);
}

export function registerInstructorName(names: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return sortInstructorNames(names);
  const lower = trimmed.toLowerCase();
  if (names.some((n) => n.toLowerCase() === lower)) {
    return sortInstructorNames(names);
  }
  return sortInstructorNames([...names, trimmed]);
}
