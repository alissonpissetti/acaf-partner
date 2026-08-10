import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PhotoUploadSection } from '../components/PhotoUploadSection';
import { UnitAddressFields } from '../components/UnitAddressFields';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { UnitWeeklyHoursFields } from '../components/UnitWeeklyHoursFields';
import { formatUnitLocation, unitToAddressForm } from '../data/address';
import { getModalityCatalog } from '../data/connectDomain';
import { patchUnitModalities } from '../data/unitModalities';
import { parseUnitEditTab, type UnitEditTab } from '../data/unitEditPaths';
import {
  formatOpenHoursSummary,
  normalizeWeeklySchedule,
  weeklyScheduleFromUnit,
} from '../data/weeklySchedule';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import './UnitEditPage.css';

const TABS: { id: UnitEditTab; label: string }[] = [
  { id: 'dados', label: 'Dados da unidade' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'horario', label: 'Horário' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'modalidades', label: 'Modalidades' },
];

export function UnitEditPage() {
  const { unitId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, unit, selectUnit, updateUnit, saveUnit } = usePortal();
  const flash = useFlash();
  const syncedRef = useRef(false);
  const modalityCatalog = getModalityCatalog();

  const activeTab = parseUnitEditTab(searchParams.get('tab'));
  const listedUnit = state.units.find((u) => u.id === unitId);
  const weeklySchedule = weeklyScheduleFromUnit(unit);
  const addressForm = unitToAddressForm(unit);

  useEffect(() => {
    if (!unitId) return;
    if (state.activeUnitId === unitId) {
      syncedRef.current = true;
      return;
    }
    if (!syncedRef.current) {
      void selectUnit(unitId);
      return;
    }
    navigate(`/unidades/${state.activeUnitId}${location.search}`, { replace: true });
  }, [unitId, state.activeUnitId, selectUnit, navigate, location.search]);

  const setActiveTab = (tab: UnitEditTab) => {
    if (tab === 'dados') {
      setSearchParams({});
      return;
    }
    setSearchParams({ tab });
  };

  const onWeeklyScheduleChange = (next: ReturnType<typeof weeklyScheduleFromUnit>) => {
    const normalized = normalizeWeeklySchedule(next);
    updateUnit({
      weeklySchedule: normalized,
      openHours: formatOpenHoursSummary(normalized),
    });
  };

  const onSave = async () => {
    await saveUnit();
    flash.success('Unidade atualizada.');
  };

  if (!listedUnit) {
    return (
      <div className="page-stack">
        <UnitScopeBanner />
        <p className="units-error">Unidade não encontrada.</p>
        <Link to="/unidades" className="btn btn-secondary">
          Voltar para unidades
        </Link>
      </div>
    );
  }

  if (unit.id !== unitId) {
    return (
      <div className="page-stack">
        <UnitScopeBanner />
        <p className="page-subtitle">Carregando unidade…</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header className="unit-edit-header">
        <div>
          <nav className="unit-edit-breadcrumbs" aria-label="Navegação">
            <Link to="/unidades">Unidades</Link>
            <span aria-hidden> / </span>
            <span>{unit.unitName}</span>
          </nav>
          <h1 className="page-title">Editar unidade</h1>
          <p className="page-subtitle">
            {formatUnitLocation(unit)} — como a unidade aparece no ACAF Connect.
          </p>
        </div>
        <Link to="/unidades" className="btn btn-ghost">
          Voltar para unidades
        </Link>
      </header>

      <section className="card unit-edit-panel">
        <div className="unit-edit-tabs" role="tablist" aria-label="Seções da unidade">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'unit-edit-tab active' : 'unit-edit-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="unit-edit-panel-body">
          {activeTab === 'dados' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <div className="field">
                <label>Nome da unidade</label>
                <input
                  value={unit.unitName}
                  onChange={(ev) => updateUnit({ unitName: ev.target.value })}
                />
              </div>
              <div className="field">
                <label>Descrição para os alunos</label>
                <textarea
                  rows={4}
                  value={unit.description}
                  onChange={(ev) => updateUnit({ description: ev.target.value })}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'endereco' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <UnitAddressFields
                value={addressForm}
                onChange={(patch) => updateUnit(patch)}
                embedded
              />
            </div>
          ) : null}

          {activeTab === 'horario' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <UnitWeeklyHoursFields
                value={weeklySchedule}
                onChange={onWeeklyScheduleChange}
                embedded
              />
            </div>
          ) : null}

          {activeTab === 'fotos' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <PhotoUploadSection unit={unit} onChange={updateUnit} embedded />
            </div>
          ) : null}

          {activeTab === 'modalidades' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <p className="unit-edit-modalities-lead">
                Marque o que a unidade oferece de fato. Essa lista alimenta{' '}
                <Link to="/comercial/planos">Planos</Link>,{' '}
                <Link to="/comercial/diarias">Diárias</Link> e{' '}
                <Link to="/comercial/agenda">Programação</Link>.
              </p>
              <div className="establishment-modalities-actions">
                <span className="establishment-modalities-count">
                  <strong>{unit.modalities.length}</strong> selecionada
                  {unit.modalities.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => updateUnit(patchUnitModalities(unit, [...modalityCatalog]))}
                >
                  Marcar catálogo completo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={unit.modalities.length === 0}
                  onClick={() => updateUnit(patchUnitModalities(unit, []))}
                >
                  Limpar seleção
                </button>
              </div>
              {unit.modalities.length === 0 && (
                <p className="establishment-modalities-empty">
                  Nenhuma modalidade ainda. Selecione abaixo antes de configurar planos ou diárias.
                </p>
              )}
              <div className="establishment-mod-chips">
                {modalityCatalog.map((m) => {
                  const on = unit.modalities.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      className={on ? 'chip chip-active' : 'chip'}
                      onClick={() => {
                        const nextModalities = on
                          ? unit.modalities.filter((x) => x !== m)
                          : [...unit.modalities, m];
                        updateUnit(patchUnitModalities(unit, nextModalities));
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="unit-edit-savebar">
            <button type="button" className="btn btn-primary" onClick={() => void onSave()}>
              Salvar alterações
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
