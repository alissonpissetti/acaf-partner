import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPortal, patchUnit, unitPatchWithoutPhotos } from '../../api/client';
import { UnitAddressFields } from '../../components/UnitAddressFields';
import { unitToAddressForm, type UnitAddressForm } from '../../data/address';
import type { GymUnit } from '../../types';
import { usePortal } from '../../portalContext';

type Props = {
  onFinish: () => void;
  onSkip: () => void;
};

function cloneUnit(unit: GymUnit): GymUnit {
  return {
    ...unit,
    modalities: [...unit.modalities],
    dailyPassModalities: [...unit.dailyPassModalities],
    planSpecs: unit.planSpecs.map((p) => ({ ...p, includedModalities: [...p.includedModalities] })),
    galleryPhotoDataUrls: [...unit.galleryPhotoDataUrls],
  };
}

export function PartnerOnboardingUnitsStep({ onFinish, onSkip }: Props) {
  const { state } = usePortal();
  const [units, setUnits] = useState<GymUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const portal = await fetchPortal('single');
      setUnits(portal.units.map(cloneUnit));
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as unidades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = units[index];
  const total = units.length;
  const networkName = state.networkName || 'sua rede';

  const addressForm = useMemo(
    () => (current ? unitToAddressForm(current) : unitToAddressForm({})),
    [current],
  );

  const patchCurrent = (patch: Partial<GymUnit>) => {
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  };

  const onAddressChange = (patch: Partial<UnitAddressForm>) => {
    if (!current) return;
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  };

  const saveCurrent = async (): Promise<boolean> => {
    if (!current) return true;
    setBusy(true);
    setError(null);
    try {
      await patchUnit(current.id, unitPatchWithoutPhotos(current), 'single');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a unidade.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSaveAndNext = async () => {
    const ok = await saveCurrent();
    if (!ok) return;
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    onFinish();
  };

  const locked = busy || loading;

  return (
    <div className="onb-step-body onb-wizard-card">
      <p className="onb-step-kicker">Passo 3 de 3 · opcional</p>
      <h2 className="onb-step-title">Dados das unidades</h2>
      <p className="onb-step-lead">
        Revise como cada unidade da <strong>{networkName}</strong> aparece no app (nome, descrição e endereço).
        Fotos, horários e modalidades você ajusta depois em <strong>Unidades</strong> no portal.
      </p>

      {error ? (
        <p className="login-form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Carregando unidades…</p>
      ) : total === 0 ? (
        <p className="muted">Nenhuma unidade encontrada. Continue para o portal.</p>
      ) : (
        <>
          {total > 1 ? (
            <p className="onb-unit-progress" aria-live="polite">
              Unidade <strong>{index + 1}</strong> de <strong>{total}</strong>
              {current ? <> · {current.unitName}</> : null}
            </p>
          ) : null}

          {current ? (
            <div className="onb-unit-form">
              <div className="field">
                <label htmlFor="onb-unit-name">Nome da unidade</label>
                <input
                  id="onb-unit-name"
                  value={current.unitName}
                  onChange={(ev) => patchCurrent({ unitName: ev.target.value })}
                  disabled={locked}
                />
              </div>
              <div className="field">
                <label htmlFor="onb-unit-desc">Descrição para os alunos</label>
                <textarea
                  id="onb-unit-desc"
                  rows={3}
                  value={current.description}
                  onChange={(ev) => patchCurrent({ description: ev.target.value })}
                  disabled={locked}
                />
              </div>
              <h3 className="onb-unit-section-title">Endereço</h3>
              <UnitAddressFields value={addressForm} onChange={onAddressChange} disabled={locked} embedded />
            </div>
          ) : null}

          <div className="onb-step-actions">
            <button type="button" className="btn btn-primary" disabled={locked || !current} onClick={() => void onSaveAndNext()}>
              {busy
                ? 'Salvando…'
                : index < total - 1
                  ? 'Salvar e próxima unidade'
                  : 'Salvar e ir para o portal'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={locked} onClick={onSkip}>
              Pular por agora
            </button>
          </div>
        </>
      )}

      {!loading && total === 0 ? (
        <div className="onb-step-actions">
          <button type="button" className="btn btn-primary" onClick={onFinish}>
            Ir para o portal
          </button>
        </div>
      ) : null}
    </div>
  );
}
