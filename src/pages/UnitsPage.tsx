import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setForm(emptyForm);
      flash.success(`${created.unitName} criada. Complete fotos e modalidades em Unidades → Editar.`);
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
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Unidades</h1>
        <p className="page-subtitle">
          Rede <strong>{state.networkName}</strong> · {state.units.length} unidade
          {state.units.length === 1 ? '' : 's'} cadastrada{state.units.length === 1 ? '' : 's'}.
        </p>
      </header>

      <div className="card units-table-card">
        <h2 className="section-title">Unidades da rede</h2>
        <div className="units-table-wrap">
          <table className="units-table">
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
              {state.units.map((u) => {
                const isActive = u.id === state.activeUnitId;
                return (
                  <tr key={u.id} className={isActive ? 'units-row-active' : undefined}>
                    <td>
                      <span className="units-name">{u.unitName}</span>
                      {isActive && <span className="units-badge">Em edição</span>}
                    </td>
                    <td>
                      {u.neighborhood} · {u.city}
                    </td>
                    <td>
                      {u.modalities.length === 0 ? (
                        <span className="units-muted">Nenhuma — cadastrar</span>
                      ) : (
                        <span className="units-mod-summary" title={u.modalities.join(', ')}>
                          {u.modalities.slice(0, 3).join(' · ')}
                          {u.modalities.length > 3 ? ` +${u.modalities.length - 3}` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      {u.dailyPassActive ? (
                        <span>{formatBRL(u.dailyPassPrice)} · ativa</span>
                      ) : (
                        <span className="units-muted">Inativa</span>
                      )}
                    </td>
                    <td className="units-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(u.id)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="units-hint">
          Clique em <strong>Editar</strong> para ajustar dados, horários, fotos e modalidades de cada filial.
          Depois monte planos e diárias em Operação.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Nova unidade</h2>
        <p className="page-subtitle units-form-intro">
          Cria a filial na rede com planos padrão e extrato zerado. Depois ajuste preços, fotos e
          modalidades.
        </p>
        <form className="form-grid units-form" onSubmit={(ev) => void onCreate(ev)}>
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
            <label htmlFor="unit-desc">Descrição no ACAF Connect (opcional)</label>
            <textarea
              id="unit-desc"
              rows={3}
              value={form.description}
              onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))}
            />
          </div>
          <div className="units-form-footer">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Criando…' : 'Criar unidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
