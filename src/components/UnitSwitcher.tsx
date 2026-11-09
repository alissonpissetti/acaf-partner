import { usePortal } from '../portalContext';
import './UnitSwitcher.css';

const ALL_UNITS = '__all__';

/**
 * Seletor de unidade compacto: um único controle com "Toda a rede" como primeira opção.
 * Substitui o par "Visão do painel" + select, que ocupava metade do menu.
 */
export function UnitSwitcher() {
  const { state, selectUnit, setUnitScope, isAllUnits } = usePortal();
  const hasMultipleUnits = state.units.length > 1;

  if (!hasMultipleUnits) {
    const unit = state.units[0];
    if (!unit) return null;

    return (
      <div className="unit-switcher unit-switcher--static">
        <span className="unit-switcher-network">{state.networkName}</span>
        <span className="unit-switcher-value">{unit.unitName}</span>
      </div>
    );
  }

  const value = isAllUnits ? ALL_UNITS : state.activeUnitId;

  const onChange = async (next: string) => {
    if (next === ALL_UNITS) {
      setUnitScope('all');
      return;
    }
    if (isAllUnits) setUnitScope('single');
    if (next !== state.activeUnitId) await selectUnit(next);
  };

  return (
    <div className="unit-switcher">
      <label className="unit-switcher-network" htmlFor="unit-select">
        {state.networkName}
      </label>
      <div className="unit-switcher-control">
        <select
          id="unit-select"
          className="unit-switcher-select"
          value={value}
          onChange={(e) => void onChange(e.target.value)}
        >
          <option value={ALL_UNITS}>Toda a rede · {state.units.length} unidades</option>
          {state.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unitName}
            </option>
          ))}
        </select>
        <svg className="unit-switcher-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m7 10 5 5 5-5" />
        </svg>
      </div>
    </div>
  );
}

export function UnitScopeBanner() {
  return null;
}
