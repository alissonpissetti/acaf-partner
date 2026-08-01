import type { GymUnit } from '../api/client';
import type { UnitScope } from '../types';

export function unitDisplayName(units: GymUnit[], unitId: string): string {
  return units.find((u) => u.id === unitId)?.unitName ?? unitId;
}

export function scopeSummary(state: {
  unitScope: UnitScope;
  units: GymUnit[];
  activeUnitId: string;
}): string {
  if (state.unitScope === 'all') {
    return `Todas as unidades (${state.units.length})`;
  }
  return unitDisplayName(state.units, state.activeUnitId);
}

export function isAllUnitsScope(unitScope: UnitScope): boolean {
  return unitScope === 'all';
}
