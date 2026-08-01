import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MODALITY_CATALOG } from '../types';
import { PhotoUploadSection } from '../components/PhotoUploadSection';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { patchUnitModalities } from '../data/unitModalities';
import { usePortal } from '../portalContext';
import './EstablishmentPage.css';

export function EstablishmentPage() {
  const { unit, updateUnit, saveUnit } = usePortal();
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    await saveUnit();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Dados cadastrais</h1>
        <p className="page-subtitle">
          Como {unit.unitName} aparece no ACAF Connect: fotos, horários, descrição e{' '}
          <strong>modalidades da unidade</strong> (base para planos e diárias).
          Gerencie filiais em <Link to="/unidades">Unidades</Link>.
        </p>
      </header>

      <div className="card form-grid">
        <div className="form-grid form-grid-2">
          <div className="field">
            <label>Nome da unidade</label>
            <input value={unit.unitName} onChange={(ev) => updateUnit({ unitName: ev.target.value })} />
          </div>
          <div className="field">
            <label>Bairro</label>
            <input
              value={unit.neighborhood}
              onChange={(ev) => updateUnit({ neighborhood: ev.target.value })}
            />
          </div>
          <div className="field">
            <label>Cidade</label>
            <input value={unit.city} onChange={(ev) => updateUnit({ city: ev.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Horário de funcionamento</label>
          <input value={unit.openHours} onChange={(ev) => updateUnit({ openHours: ev.target.value })} />
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

      <PhotoUploadSection unit={unit} onChange={updateUnit} />

      <section className="card establishment-modalities-card" aria-labelledby="unit-modalities-title">
        <h2 id="unit-modalities-title" className="section-title">
          Modalidades desta unidade
        </h2>
        <p className="establishment-modalities-lead">
          Marque o que a unidade oferece de fato. Essa lista alimenta{' '}
          <Link to="/comercial/planos">Planos Connect</Link> e{' '}
          <Link to="/comercial/diarias">Diárias</Link>: só dá para montar ofertas com modalidades
          cadastradas aqui.
        </p>
        <div className="establishment-modalities-actions">
          <span className="establishment-modalities-count">
            <strong>{unit.modalities.length}</strong> selecionada{unit.modalities.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => updateUnit(patchUnitModalities(unit, [...MODALITY_CATALOG]))}
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
          {MODALITY_CATALOG.map((m) => {
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
      </section>

      <div className="establishment-savebar">
        <button type="button" className="btn btn-primary" onClick={() => void onSave()}>
          Salvar alterações
        </button>
        {saved && <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Unidade atualizada.</span>}
      </div>
    </div>
  );
}
