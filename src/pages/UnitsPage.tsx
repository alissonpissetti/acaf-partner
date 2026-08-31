import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { unitEditPath } from '../data/unitEditPaths';
import { useFlash } from '../flashContext';
import { formatBRL } from '../types';
import { usePortal } from '../portalContext';
import './UnitsPage.css';

const emptyForm = {
  unitName: '',
  neighborhood: '',
  city: '',
  openHours: '',
  description: '',
};

export function UnitsPage() {
  const { state, createUnit } = usePortal();
  const flash = useFlash();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.units;
    return state.units.filter(
      (unit) =>
        unit.unitName.toLowerCase().includes(q) ||
        unit.city.toLowerCase().includes(q) ||
        unit.neighborhood.toLowerCase().includes(q),
    );
  }, [state.units, query]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const closeCreateModal = () => {
    if (busy) return;
    setCreateOpen(false);
    resetForm();
  };

  const onCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const created = await createUnit({
        unitName: form.unitName,
        neighborhood: form.neighborhood,
        city: form.city,
        openHours: form.openHours || undefined,
        description: form.description || undefined,
      });
      resetForm();
      setCreateOpen(false);
      flash.success(`${created.unitName} criada. Complete fotos e modalidades em Editar.`);
      navigate(unitEditPath(created.id));
    } catch (e) {
      flash.error(e instanceof Error ? e.message : 'Não foi possível criar a unidade.');
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (id: string) => {
    navigate(unitEditPath(id));
  };

  return (
    <div className="page-stack units-page">
      <UnitScopeBanner />

      <header className="units-page-header">
        <div>
          <h1 className="page-title">Unidades</h1>
          <p className="page-subtitle">
            Rede <strong>{state.networkName}</strong> · cadastre filiais, fotos e modalidades para
            vender planos e diárias no app.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          Nova unidade
        </button>
      </header>

      <div className="units-toolbar">
        <input
          className="units-search"
          placeholder="Buscar por nome, bairro ou cidade"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
        />
      </div>

      <p className="units-count">
        {rows.length} unidade{rows.length === 1 ? '' : 's'}
        {query.trim() && rows.length !== state.units.length
          ? ` de ${state.units.length}`
          : ''}
      </p>

      <div className="table-wrap">
        <table className="data-table units-table">
          <thead>
            <tr>
              <th>Unidade</th>
              <th>Local</th>
              <th>Modalidades</th>
              <th>Diária</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="units-empty">
                  {state.units.length === 0
                    ? 'Nenhuma unidade cadastrada ainda. Use o botão acima para criar a primeira.'
                    : 'Nenhuma unidade encontrada para a busca.'}
                </td>
              </tr>
            ) : (
              rows.map((unit) => {
                const isActive = unit.id === state.activeUnitId;
                return (
                  <tr
                    key={unit.id}
                    className={`units-row-clickable${isActive ? ' units-row-active' : ''}`}
                    onClick={() => onEdit(unit.id)}
                  >
                    <td>
                      <div className="units-name">{unit.unitName}</div>
                      {isActive ? <span className="units-active-badge">Em edição</span> : null}
                    </td>
                    <td>
                      <span className="units-location">
                        {unit.neighborhood} · {unit.city}
                      </span>
                    </td>
                    <td>
                      {unit.modalities.length === 0 ? (
                        <span className="units-muted">Nenhuma — cadastrar</span>
                      ) : (
                        <span className="units-mod-summary" title={unit.modalities.join(', ')}>
                          {unit.modalities.slice(0, 3).join(' · ')}
                          {unit.modalities.length > 3 ? ` +${unit.modalities.length - 3}` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      {unit.dailyPassActive ? (
                        <span className="units-daily-badge units-daily-badge--active">
                          {formatBRL(unit.dailyPassPrice)} · ativa
                        </span>
                      ) : (
                        <span className="units-daily-badge units-daily-badge--inactive">Inativa</span>
                      )}
                    </td>
                    <td className="units-actions">
                      <button
                        type="button"
                        className="btn-link"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onEdit(unit.id);
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="toast-hint">
        Clique em uma unidade para editar dados, endereço, horários, fotos e modalidades. Depois
        configure planos e diárias em Operação.
      </p>

      <Modal
        open={createOpen}
        title="Nova unidade"
        panelClassName="units-create-modal"
        onClose={closeCreateModal}
      >
        <p className="units-create-lead">
          Cria a filial na rede com planos padrão e extrato zerado. Depois ajuste preços, fotos e
          modalidades na edição.
        </p>
        <form className="form-grid units-create-form" onSubmit={(ev) => void onCreate(ev)}>
          <div className="form-grid form-grid-2">
            <div className="field">
              <label htmlFor="unit-name">Nome da unidade</label>
              <input
                id="unit-name"
                required
                placeholder="Ex.: Unidade Centro"
                value={form.unitName}
                onChange={(ev) => setForm((f) => ({ ...f, unitName: ev.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="unit-city">Cidade</label>
              <input
                id="unit-city"
                required
                placeholder="Ex.: Curitiba/PR"
                value={form.city}
                onChange={(ev) => setForm((f) => ({ ...f, city: ev.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="unit-hood">Bairro / região</label>
              <input
                id="unit-hood"
                required
                placeholder="Ex.: Batel"
                value={form.neighborhood}
                onChange={(ev) => setForm((f) => ({ ...f, neighborhood: ev.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="unit-hours">Horário (opcional)</label>
              <input
                id="unit-hours"
                placeholder="Seg–Sex 6h–22h"
                value={form.openHours}
                onChange={(ev) => setForm((f) => ({ ...f, openHours: ev.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="unit-desc">Descrição no app (opcional)</label>
            <textarea
              id="unit-desc"
              rows={3}
              value={form.description}
              onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))}
            />
          </div>
          <div className="units-create-actions">
            <button type="button" className="btn btn-secondary" onClick={closeCreateModal} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Criando…' : 'Criar unidade'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
