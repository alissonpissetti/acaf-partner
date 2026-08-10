import { useState } from 'react';
import { CurrencyBrlInput } from './CurrencyBrlInput';
import { roundDailyPassPrice } from '../data/acafFees';
import {
  createEmptyPricingRule,
  formatRuleDays,
  formatRuleTimeRange,
  pricingRuleNetSimulation,
} from '../data/dailyPassPricing';
import { effectiveDailyPassModalities } from '../data/dailyPassModalities';
import type { DailyPassPricingRule, GymUnit } from '../types';
import { WEEKDAY_LABELS, WEEKDAY_ORDER, formatBRL } from '../types';

type Props = {
  unit: GymUnit;
  rules: DailyPassPricingRule[];
  disabled?: boolean;
  onChange: (rules: DailyPassPricingRule[]) => void;
};

export function DailyPassPricingRulesEditor({ unit, rules, disabled, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DailyPassPricingRule | null>(null);
  const availableModalities = effectiveDailyPassModalities(unit);

  const startNew = () => {
    const rule = createEmptyPricingRule(unit);
    setDraft(rule);
    setEditingId('new');
  };

  const startEdit = (rule: DailyPassPricingRule) => {
    setDraft({ ...rule, daysOfWeek: [...rule.daysOfWeek], modalities: [...rule.modalities] });
    setEditingId(rule.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const commitDraft = () => {
    if (!draft) return;
    if (editingId === 'new') {
      onChange([...rules, draft]);
    } else {
      onChange(rules.map((r) => (r.id === draft.id ? draft : r)));
    }
    cancelEdit();
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
    if (editingId === id) cancelEdit();
  };

  const toggleDay = (day: DailyPassPricingRule['daysOfWeek'][number]) => {
    if (!draft) return;
    const has = draft.daysOfWeek.includes(day);
    const next = has ? draft.daysOfWeek.filter((d) => d !== day) : [...draft.daysOfWeek, day];
    setDraft({ ...draft, daysOfWeek: next });
  };

  const toggleModality = (modality: string) => {
    if (!draft) return;
    const has = draft.modalities.includes(modality);
    const next = has
      ? draft.modalities.filter((m) => m !== modality)
      : [...draft.modalities, modality];
    setDraft({ ...draft, modalities: next });
  };

  return (
    <div className="daily-pass-rules-editor">
      <div className="daily-pass-rules-editor-head">
        <div>
          <h2 className="section-title">Faixas promocionais</h2>
          <p className="daily-pass-section-lead">
            Preços por horário e modalidade. Fora dessas faixas, vale a diária integral.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || availableModalities.length === 0}
          onClick={startNew}
        >
          Nova faixa
        </button>
      </div>

      {availableModalities.length === 0 && (
        <p className="daily-pass-empty">Configure modalidades na diária integral antes de criar faixas.</p>
      )}

      {rules.length > 0 && (
        <div className="daily-pass-rules-table-wrap">
          <table className="daily-pass-rules-table">
            <thead>
              <tr>
                <th>Dias</th>
                <th>Horário</th>
                <th>Modalidades</th>
                <th>Preço</th>
                <th>Repasse</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const sim = pricingRuleNetSimulation(rule.price);
                return (
                  <tr key={rule.id} className={rule.active ? '' : 'is-inactive'}>
                    <td>{formatRuleDays(rule.daysOfWeek)}</td>
                    <td>{formatRuleTimeRange(rule.startTime, rule.endTime)}</td>
                    <td>{rule.modalities.join(', ')}</td>
                    <td>{formatBRL(rule.price)}</td>
                    <td className="daily-pass-rules-net">{formatBRL(sim.net)}</td>
                    <td>
                      <span className={`daily-pass-rules-badge ${rule.active ? 'is-active' : ''}`}>
                        {rule.active ? 'Ativa' : 'Pausada'}
                      </span>
                    </td>
                    <td className="daily-pass-rules-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={disabled}
                        onClick={() => startEdit(rule)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm danger"
                        disabled={disabled}
                        onClick={() => removeRule(rule.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rules.length === 0 && availableModalities.length > 0 && (
        <p className="daily-pass-empty">Nenhuma faixa cadastrada. Use &quot;Nova faixa&quot; para começar.</p>
      )}

      {draft && editingId && (
        <div className="daily-pass-rules-form card-inner">
          <h3 className="daily-pass-rules-form-title">
            {editingId === 'new' ? 'Nova faixa promocional' : 'Editar faixa'}
          </h3>
          <div className="form-grid form-grid-2">
            <div className="field field-span-2">
              <label>Nome (opcional)</label>
              <input
                value={draft.label ?? ''}
                placeholder="Ex.: Manhã tranquila"
                onChange={(ev) => setDraft({ ...draft, label: ev.target.value })}
              />
            </div>
            <div className="field">
              <label>De</label>
              <input
                type="time"
                value={draft.startTime}
                onChange={(ev) => setDraft({ ...draft, startTime: ev.target.value })}
              />
            </div>
            <div className="field">
              <label>Até</label>
              <input
                type="time"
                value={draft.endTime}
                onChange={(ev) => setDraft({ ...draft, endTime: ev.target.value })}
              />
            </div>
            <div className="field field-span-2">
              <label>Dias da semana</label>
              <div className="daily-pass-chips">
                {WEEKDAY_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={draft.daysOfWeek.includes(day) ? 'chip chip-active' : 'chip'}
                    onClick={() => toggleDay(day)}
                  >
                    {WEEKDAY_LABELS[day].slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field field-span-2">
              <CurrencyBrlInput
                id={`rule-price-${draft.id}`}
                label="Preço da faixa"
                value={roundDailyPassPrice(draft.price)}
                onChange={(v) => setDraft({ ...draft, price: v })}
              />
            </div>
            <div className="field field-span-2">
              <label>Modalidades incluídas</label>
              <div className="daily-pass-chips">
                {availableModalities.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={draft.modalities.includes(m) ? 'chip chip-active' : 'chip'}
                    onClick={() => toggleModality(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="field field-checkbox field-span-2">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(ev) => setDraft({ ...draft, active: ev.target.checked })}
                />
                Faixa ativa para venda
              </label>
            </div>
          </div>
          <div className="daily-pass-rules-form-actions">
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                draft.daysOfWeek.length === 0 ||
                draft.modalities.length === 0 ||
                draft.startTime >= draft.endTime
              }
              onClick={commitDraft}
            >
              {editingId === 'new' ? 'Adicionar faixa' : 'Salvar faixa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
