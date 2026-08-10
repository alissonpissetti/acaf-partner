export type UnitEditTab = 'dados' | 'endereco' | 'horario' | 'fotos' | 'modalidades';

const VALID_TABS = new Set<UnitEditTab>(['dados', 'endereco', 'horario', 'fotos', 'modalidades']);

export function unitEditPath(unitId: string, tab?: UnitEditTab): string {
  const base = `/unidades/${unitId}`;
  return tab && tab !== 'dados' ? `${base}?tab=${tab}` : base;
}

export function parseUnitEditTab(value: string | null): UnitEditTab {
  if (value && VALID_TABS.has(value as UnitEditTab)) {
    return value as UnitEditTab;
  }
  return 'dados';
}
