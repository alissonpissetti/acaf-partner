import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CurrencyBrlInput } from '../components/CurrencyBrlInput';
import { DailyPassPricingRulesEditor } from '../components/DailyPassPricingRulesEditor';
import {
  ACAF_CONNECT_FEE_PERCENT,
  dailyPassTotalPerSale,
  dailyPassAcafFee,
  dailyPassGymNet,
  roundDailyPassPrice,
} from '../data/acafFees';
import {
  effectiveDailyPassModalities,
  sanitizeDailyPassModalities,
} from '../data/dailyPassModalities';
import { sortModalitiesAlphabetically } from '../data/modalitySort';
import { validateDailyPassPricingRulesClient } from '../data/dailyPassPricing';
import { unitEditPath } from '../data/unitEditPaths';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import { formatBRL } from '../types';
import './DailyPassPage.css';

export function DailyPassPage() {
  const { unit, updateUnit, saveUnit } = usePortal();
  const flash = useFlash();
  const [saving, setSaving] = useState(false);

  const dailyPrice = roundDailyPassPrice(unit.dailyPassPrice);
  const totalGross = dailyPassTotalPerSale(dailyPrice);
  const fee = dailyPassAcafFee(dailyPrice);
  const net = dailyPassGymNet(dailyPrice);
  const included = effectiveDailyPassModalities(unit);
  const displayModalities = useMemo(
    () => sortModalitiesAlphabetically(unit.modalities),
    [unit.modalities],
  );
  const configured = unit.dailyPassModalities ?? [];
  const rules = unit.dailyPassPricingRules ?? [];
  const hasActiveRules = rules.some((r) => r.active && r.modalities.length > 0);
  const canSave =
    !unit.dailyPassActive || included.length > 0 || hasActiveRules;
  const rulesError = validateDailyPassPricingRulesClient(unit, rules);

  const toggleDailyModality = (modality: string) => {
    const base =
      configured.length > 0 ? configured : unit.modalities.filter((m) => included.includes(m));
    const next = base.includes(modality)
      ? base.filter((m) => m !== modality)
      : [...base, modality];
    updateUnit({
      dailyPassModalities: sanitizeDailyPassModalities(unit.modalities, next),
    });
  };

  const onSave = async () => {
    if (rulesError) {
      flash.error(rulesError);
      return;
    }
    setSaving(true);
    try {
      await saveUnit();
      flash.success('Alterações salvas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack daily-pass-page">
      <header className="daily-pass-header">
        <div>
          <h1 className="page-title">Diárias</h1>
          <p className="page-subtitle">
            {unit.unitName} · preço da diária vendida no ACAF Connect (sem benefício corporativo).
          </p>
        </div>
      </header>

      <div className={`daily-pass-status card ${unit.dailyPassActive ? 'is-active' : 'is-paused'}`}>
        <div className="daily-pass-status-text">
          <span className="daily-pass-status-kicker">Disponibilidade no app</span>
          <strong>{unit.dailyPassActive ? 'Diária ativa para venda' : 'Diária pausada'}</strong>
          <p>
            {unit.dailyPassActive
              ? 'Alunos podem comprar diária para esta unidade no ACAF Connect.'
              : 'Ninguém consegue comprar diária até você reativar.'}
          </p>
        </div>
        <label className="toggle daily-pass-toggle" aria-label="Ativar venda de diária">
          <input
            type="checkbox"
            checked={unit.dailyPassActive}
            onChange={(ev) => updateUnit({ dailyPassActive: ev.target.checked })}
          />
          <span />
        </label>
      </div>

      <div className="daily-pass-layout">
        <section className="card daily-pass-price-card">
          <h2 className="section-title">Diária integral</h2>
          <p className="daily-pass-section-lead">
            Preço padrão fora das faixas promocionais. Vale o dia inteiro na unidade.
          </p>
          <CurrencyBrlInput
            id="daily-pass-price"
            label="Valor da diária"
            value={dailyPrice}
            disabled={!unit.dailyPassActive}
            onChange={(v) => updateUnit({ dailyPassPrice: v })}
          />
        </section>

        <section className="card daily-pass-breakdown" aria-labelledby="daily-breakdown-title">
          <h2 id="daily-breakdown-title" className="section-title">
            Simulação por venda
          </h2>
          <p className="daily-pass-section-lead">
            Taxa ACAF Connect {ACAF_CONNECT_FEE_PERCENT}% sobre o valor da diária.
          </p>
          <ul className="daily-pass-breakdown-list">
            <li className="daily-pass-breakdown-total">
              <span>Valor da diária</span>
              <strong>{formatBRL(totalGross)}</strong>
            </li>
            <li className="daily-pass-breakdown-fee">
              <span>Taxa ACAF ({ACAF_CONNECT_FEE_PERCENT}%)</span>
              <strong>− {formatBRL(fee)}</strong>
            </li>
            <li className="daily-pass-breakdown-net">
              <span>Você recebe</span>
              <strong>{formatBRL(net)}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section className="card daily-pass-promo-rules">
        <DailyPassPricingRulesEditor
          unit={unit}
          rules={rules}
          disabled={!unit.dailyPassActive}
          onChange={(next) => updateUnit({ dailyPassPricingRules: next })}
        />
        {rulesError && unit.dailyPassActive && (
          <p className="daily-pass-error">{rulesError}</p>
        )}
      </section>

      <section className="card daily-pass-modalities">
        <div className="daily-pass-modalities-head">
          <div>
            <h2 className="section-title">Modalidades da diária integral</h2>
            <p className="daily-pass-section-lead">
              O que o aluno pode usar com a diária integral (fora das faixas).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={unit.modalities.length === 0}
            onClick={() => updateUnit({ dailyPassModalities: [...unit.modalities] })}
          >
            Marcar todas
          </button>
        </div>
        {unit.modalities.length === 0 ? (
          <p className="daily-pass-empty">
            Cadastre modalidades em{' '}
            <Link to={unitEditPath(unit.id, 'modalidades')}>Unidades → Modalidades</Link>.
          </p>
        ) : (
          <div className="daily-pass-chips">
            {displayModalities.map((m) => {
              const on = included.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  className={on ? 'chip chip-active' : 'chip'}
                  disabled={!unit.dailyPassActive}
                  onClick={() => toggleDailyModality(m)}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
        {unit.dailyPassActive && included.length === 0 && !hasActiveRules && unit.modalities.length > 0 && (
          <p className="daily-pass-error">
            Selecione modalidades na integral ou cadastre faixas promocionais.
          </p>
        )}
      </section>

      <section className="card daily-pass-rules">
        <h2 className="section-title">Regras para o aluno</h2>
        <p className="daily-pass-section-lead">Texto exibido no ACAF Connect na hora da compra.</p>
        <textarea
          className="daily-pass-notes"
          rows={4}
          placeholder="Ex.: Válida no dia da compra até o fechamento da unidade."
          value={unit.dailyPassNotes}
          disabled={!unit.dailyPassActive}
          onChange={(ev) => updateUnit({ dailyPassNotes: ev.target.value })}
        />
      </section>

      <div className="daily-pass-savebar">
        <button
          type="button"
          className="btn btn-primary daily-pass-save"
          disabled={!canSave || saving || Boolean(rulesError)}
          onClick={() => void onSave()}
        >
          {saving ? 'Salvando…' : 'Salvar diária'}
        </button>
      </div>
    </div>
  );
}
