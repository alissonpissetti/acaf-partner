import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import {
  acafConnectFeePercent,
  acafFeeFromGross,
  CORPORATE_BENEFIT_PER_MONTH,
  monthlyGymRepasseForStudentPlan,
  studentPlanTotalGross,
} from '../data/acafFees';
import { getConnectPlans, mergeUnitPlanSpecs } from '../data/connectDomain';
import { sortModalitiesAlphabetically } from '../data/modalitySort';
import { unitEditPath } from '../data/unitEditPaths';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import {
  planModalityChipOn,
  togglePlanModalitySelection,
} from '../data/planModalities';
import { formatBRL, type ConnectPlanId } from '../types';
import './PlansPage.css';

function PlanRepasseBreakdown({
  planId,
  studentPrice,
}: {
  planId: ConnectPlanId;
  studentPrice: number;
}) {
  const corporate = CORPORATE_BENEFIT_PER_MONTH;
  const total = studentPlanTotalGross(planId, corporate);
  const fee = acafFeeFromGross(total);
  const net = monthlyGymRepasseForStudentPlan(planId, corporate);
  const feePercent = acafConnectFeePercent();

  return (
    <>
      <h3 className="plans-repasse-title">Repasse por assíduo/mês</h3>
      <p className="plans-section-lead" style={{ marginBottom: 12 }}>
        Taxa ACAF {feePercent}% sobre colaborador + empresa.
      </p>
      <ul className="plans-breakdown-list">
        <li>
          <span>Colaborador</span>
          <strong>{formatBRL(studentPrice)}</strong>
        </li>
        <li>
          <span>Empresa</span>
          <strong>{formatBRL(corporate)}</strong>
        </li>
        <li className="plans-breakdown-total">
          <span>Total movimentado</span>
          <strong>{formatBRL(total)}</strong>
        </li>
        <li className="plans-breakdown-fee">
          <span>Taxa ACAF ({feePercent}%)</span>
          <strong>− {formatBRL(fee)}</strong>
        </li>
        <li className="plans-breakdown-net">
          <span>Você recebe</span>
          <strong>{formatBRL(net)}</strong>
        </li>
      </ul>
    </>
  );
}

export function PlansPage() {
  const { unit, updatePlanSpec, saveUnit } = usePortal();
  const flash = useFlash();
  const unitMods = useMemo(
    () => sortModalitiesAlphabetically(unit.modalities),
    [unit.modalities],
  );
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const connectPlans = getConnectPlans();
  const planSpecs = useMemo(() => mergeUnitPlanSpecs(unit.planSpecs), [unit.planSpecs]);

  const enabledCount = useMemo(
    () => planSpecs.filter((s) => s.enabled).length,
    [planSpecs],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      await saveUnit();
      flash.success('Alterações salvas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack plans-page">
      <header className="plans-header">
        <div className="plans-header-main">
          <h1 className="page-title">Planos</h1>
          <p className="page-subtitle">
            {unit.unitName} · quais planos aparecem no app e o que cada um libera na unidade.
          </p>
        </div>
        <button
          type="button"
          className="plans-help-btn"
          aria-label="Como funcionam os planos"
          onClick={() => setHelpOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M12 17v-0.5M12 14.5a2.25 2.25 0 1 0-2.25-3.9c.78-.45 1.25-1.28 1.25-2.18 0-1.38-1.12-2.5-2.5-2.5S6.12 7.02 6.12 8.4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <Modal open={helpOpen} title="Como funciona" onClose={() => setHelpOpen(false)}>
        <div className="plans-help-modal">
          <strong className="plans-help-modal-title">
            Preço ao colaborador é da ACAF; você configura oferta e modalidades
          </strong>
          <p>
            Os planos e preços vêm do cadastro ACAF Connect (painel admin). Por assíduo ativo, entra também o
            benefício corporativo de {formatBRL(CORPORATE_BENEFIT_PER_MONTH)}. A taxa Connect incide sobre a
            soma; abaixo, a simulação por plano.
          </p>
          <div className="plans-help-modal-stats">
            <span>
              <strong>{enabledCount}</strong> de {connectPlans.length} planos ativos nesta unidade
            </span>
            <span>
              Preço colaborador definido pela <strong>ACAF</strong>
            </span>
          </div>
        </div>
      </Modal>

      <section
        className={`card plans-unit-modalities ${unitMods.length === 0 ? 'is-empty' : ''}`}
        aria-labelledby="plans-unit-mods-title"
      >
        <div className="plans-unit-modalities-head">
          <div>
            <h2 id="plans-unit-mods-title" className="section-title">
              Modalidades cadastradas na unidade
            </h2>
            <p className="plans-section-lead" style={{ marginBottom: 0 }}>
              Definidas em{' '}
              <Link to={unitEditPath(unit.id, 'modalidades')}>Unidades → Modalidades</Link> da unidade{' '}
              {unit.unitName}.
              Cada plano abaixo monta um subconjunto desta lista.
            </p>
          </div>
          <Link to={unitEditPath(unit.id, 'modalidades')} className="btn btn-secondary btn-sm">
            Editar modalidades
          </Link>
        </div>
        {unitMods.length === 0 ? (
          <p className="plans-empty-mods">
            Esta unidade ainda não tem modalidades. Cadastre em{' '}
            <Link to={unitEditPath(unit.id, 'modalidades')}>Unidades → Modalidades</Link> para montar os
            planos.
          </p>
        ) : (
          <div className="plans-chips plans-chips-readonly" aria-label="Modalidades da unidade">
            {unitMods.map((m) => (
              <span key={m} className="chip chip-active chip-static">
                {m}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="plans-list">
        {connectPlans.map((product) => {
          const spec = planSpecs.find((s) => s.connectPlanId === product.id)!;
          const tierLabel = `Tier ${(product.tierIndex ?? 0) + 1}`;

          return (
            <article
              key={product.id}
              className={`card plans-card ${spec.enabled ? 'is-on' : 'is-off'}`}
            >
              <div className="plans-card-head">
                <div className="plans-card-title-block">
                  <span className="plans-card-tier">{tierLabel}</span>
                  <h2 className="plans-card-name">{product.name}</h2>
                  <p className="plans-card-desc">
                    {product.description ?? 'Plano ACAF Connect.'}
                  </p>
                  <div className="plans-card-price-tag">
                    Colaborador <strong>{formatBRL(product.pricePerMonth)}</strong>/mês
                  </div>
                </div>
                <label className="toggle plans-card-toggle" aria-label={`Ofertar ${product.name} nesta unidade`}>
                  <input
                    type="checkbox"
                    checked={spec.enabled}
                    onChange={(ev) => updatePlanSpec(product.id as ConnectPlanId, { enabled: ev.target.checked })}
                  />
                  <span />
                </label>
              </div>

              {spec.enabled ? (
                <div className="plans-card-body">
                  <div className="plans-card-config">
                    <div className="plans-modalities-head">
                      <h3 className="section-title">Montar plano com modalidades da unidade</h3>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={unitMods.length === 0}
                        onClick={() =>
                          updatePlanSpec(product.id as ConnectPlanId, {
                            includedModalities: [...unitMods],
                            exactOnly: false,
                          })
                        }
                      >
                        Marcar todas
                      </button>
                    </div>
                    <label className="plans-exact-row">
                      <input
                        type="checkbox"
                        checked={spec.exactOnly}
                        onChange={(ev) =>
                          updatePlanSpec(product.id as ConnectPlanId, { exactOnly: ev.target.checked })
                        }
                      />
                      <span>
                        <strong>Restringir à seleção</strong> — se desmarcado, lista vazia significa todas as
                        modalidades cadastradas na unidade.
                      </span>
                    </label>
                    {unitMods.length === 0 ? (
                      <p className="plans-empty-mods">
                        Cadastre modalidades em{' '}
                        <Link to={unitEditPath(unit.id, 'modalidades')}>Unidades → Modalidades</Link>.
                      </p>
                    ) : (
                      <div className="plans-chips">
                        {unitMods.map((m) => {
                          const on = planModalityChipOn(spec, m, unitMods);
                          return (
                            <button
                              key={m}
                              type="button"
                              className={on ? 'chip chip-active' : 'chip'}
                              onClick={() =>
                                updatePlanSpec(product.id as ConnectPlanId, {
                                  includedModalities: togglePlanModalitySelection(spec, unitMods, m),
                                })
                              }
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="plans-card-repasse">
                    <PlanRepasseBreakdown
                      planId={product.id as ConnectPlanId}
                      studentPrice={product.pricePerMonth}
                    />
                  </div>
                </div>
              ) : (
                <p className="plans-card-off-note">
                  Plano oculto no ACAF Connect para esta unidade. Ative para configurar modalidades e ver o
                  repasse.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="plans-savebar">
        <button
          type="button"
          className="btn btn-primary plans-save"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? 'Salvando…' : 'Salvar planos'}
        </button>
      </div>
    </div>
  );
}
