/** Modalidades exibidas e liberadas na diária (subconjunto da unidade). */
export function effectiveDailyPassModalities(unit: {
  modalities: string[];
  dailyPassModalities?: string[];
}): string[] {
  const configured = unit.dailyPassModalities ?? [];
  if (configured.length === 0) {
    return [...unit.modalities];
  }
  return configured.filter((m) =>
    unit.modalities.some((u) => u.toLowerCase() === m.toLowerCase()),
  );
}

export function sanitizeDailyPassModalities(
  modalities: string[],
  dailyPassModalities: string[],
): string[] {
  return dailyPassModalities.filter((m) =>
    modalities.some((u) => u.toLowerCase() === m.toLowerCase()),
  );
}
