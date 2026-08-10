import { sortModalitiesAlphabetically } from './modalitySort';

/** Modalidades exibidas e liberadas na diária (subconjunto da unidade). */
export function effectiveDailyPassModalities(unit: {
  modalities: string[];
  dailyPassModalities?: string[];
}): string[] {
  const configured = unit.dailyPassModalities ?? [];
  let result: string[];
  if (configured.length === 0) {
    result = [...unit.modalities];
  } else {
    result = configured.filter((m) =>
      unit.modalities.some((u) => u.toLowerCase() === m.toLowerCase()),
    );
  }
  return sortModalitiesAlphabetically(result);
}

export function sanitizeDailyPassModalities(
  modalities: string[],
  dailyPassModalities: string[],
): string[] {
  return dailyPassModalities.filter((m) =>
    modalities.some((u) => u.toLowerCase() === m.toLowerCase()),
  );
}
