import { usePortal } from '../portalContext';
import './UnitSwitcher.css';

export function UnitSwitcher() {
  const { state, selectUnit, setUnitScope, isAllUnits } = usePortal();

  return (
    <div className="sidebar-unit">
      <span className="unit-network">{state.networkName}</span>

      <span className="unit-switch-label">Visão do painel</span>
      <div className="scope-segment" role="group" aria-label="Visão do painel">
        <button
          type="button"
          className={isAllUnits ? 'scope-segment-btn active' : 'scope-segment-btn'}
          onClick={() => setUnitScope('all')}
        >
          Toda a rede
        </button>
        <button
          type="button"
          className={!isAllUnits ? 'scope-segment-btn active' : 'scope-segment-btn'}
          onClick={() => setUnitScope('single')}
        >
          Uma unidade
        </button>
      </div>

      {isAllUnits ? (
        <p className="unit-scope-summary">
          Consolidado · {state.units.length} unidades
        </p>
      ) : (
        <div className="unit-picker">
          <label className="unit-switch-label" htmlFor="unit-select">
            Unidade
          </label>
          <select
            id="unit-select"
            className="unit-select"
            value={state.activeUnitId}
            onChange={(e) => void selectUnit(e.target.value)}
          >
            {state.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unitName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function UnitScopeBanner() {
  return null;
}
