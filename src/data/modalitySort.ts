/** Ordem alfabética pt-BR para combos e listas de modalidade. */
export function sortModalitiesAlphabetically(modalities: readonly string[]): string[] {
  return [...modalities].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}
