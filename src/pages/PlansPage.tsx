import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACAF_CONNECT_FEE_PERCENT,
  CORPORATE_BENEFIT_PER_MONTH,
  acafFeeFromGross,
  monthlyGymRepasseForStudentPlan,
  studentPlanTotalGross,
} from '../data/acafFees';
import { usePortal } from '../portalContext';
import {
  planModalityChipOn,
  togglePlanModalitySelection,
} from '../data/planModalities';
import { CONNECT_PLANS, formatBRL, type ConnectPlanId } from '../types';
import './PlansPage.css';

const PLAN_DESCRIPTIONS: Record<ConnectPlanId, string> = {
  'connect-start': 'Plano de entrada na rede ACAF Connect.',
  'connect-plus': 'Mais flexibilidade dentro da rede.',
  'connect-multi': 'Para quem treina com frequência em várias unidades.',
  'connect-pro': 'Tier avançado para uso intenso da rede.',
  'connect-total': 'Máximo nível de benefícios ACAF Connect.',
};

function PlanRepasseBreakdown({ planId, studentPrice }: { planId: ConnectPlanId; studentPrice: number }) {
  const corporate = CORPORATE_BENEFIT_PER_MONTH;
  const total = studentPlanTotalGross(planId, corporate);
  const fee = acafFeeFromGross(total);
  const net = monthlyGymRepasseForStudentPlan(planId, corporate);

  return (
    <>
      <h3 className="plans-repasse-title">Repasse por assíduo/mês</h3>
      <p className="plans-section-lead" style={{ marginBottom: 12 }}>
        Taxa ACAF {ACAF_CONNECT_FEE_PERCENT}% sobre colaborador + empresa.
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
          <span>Taxa ACAF ({ACAF_CONNECT_FEE_PERCENT}%)</span>
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
  const unitMods = unit.modalities;
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);

  const enabledCount = useMemo(
    () => unit.planSpecs.filter((s) => s.enabled).length,
    [unit.planSpecs],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      await saveUnit();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack plans-page">
      <header className="plans-header">
        <h1 className="page-title">Planos Connect</h1>
        <p className="page-subtitle">
          {unit.unitName} · quais planos aparecem no app e o que cada um libera na unidade.
        </p>
      </header>

      <section className="card plans-overview" aria-labelledby="plans-overview-title">
        <span className="plans-overview-kicker">Como funciona</span>
        <strong id="plans-overview-title">Preço ao colaborador é da ACAF; você configura oferta e modalidades</strong>
        <p>
          O valor mensal de cada tier é fixo na rede. Por assíduo ativo, entra também o benefício corporativo
          de {formatBRL(CORPORATE_BENEFIT_PER_MONTH)}. A taxa Connect incide sobre a soma; abaixo, a simulação
          por plano.
        </p>
        <div className="plans-overview-stats">
          <span>
            <strong>{enabledCount}</strong> de {CONNECT_PLANS.length} planos ativos nesta unidade
          </span>
          <span>
            Preço colaborador definido pela <strong>ACAF</strong>
          </span>
        </div>
      </section>

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
              Definidas em <Link to="/dados-cadastrais">Dados cadastrais</Link> da unidade {unit.unitName}.
              Cada plano abaixo monta um subconjunto desta lista.
            </p>
          </div>
          <Link to="/dados-cadastrais" className="btn btn-secondary btn-sm">
            Editar modalidades
          </Link>
        </div>
        {unitMods.length === 0 ? (
          <p className="plans-empty-mods">
            Esta unidade ainda não tem modalidades. Cadastre em Dados cadastrais para montar os planos Connect.
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
        {CONNECT_PLANS.map((product) => {
          const spec = unit.planSpecs.find((s) => s.connectPlanId === product.id)!;
          const tierLabel = `Tier ${product.tierIndex + 1}`;

          return (
            <article
              key={product.id}
              className={`card plans-card ${spec.enabled ? 'is-on' : 'is-off'}`}
            >
              <div className="plans-card-head">
                <div className="plans-card-title-block">
                  <span className="plans-card-tier">{tierLabel}</span>
                  <h2 className="plans-card-name">{product.name}</h2>
                  <p className="plans-card-desc">{PLAN_DESCRIPTIONS[product.id]}</p>
                  <div className="plans-card-price-tag">
                    Colaborador <strong>{formatBRL(product.pricePerMonth)}</strong>/mês
                  </div>
                </div>
                <label className="toggle plans-card-toggle" aria-label={`Ofertar ${product.name} nesta unidade`}>
                  <input
                    type="checkbox"
                    checked={spec.enabled}
                    onChange={(ev) => updatePlanSpec(product.id, { enabled: ev.target.checked })}
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
                          updatePlanSpec(product.id, { includedModalities: [...unitMods], exactOnly: false })
                        }
                      >
                        Marcar todas
                      </button>
                    </div>
                    <label className="plans-exact-row">
                      <input
                        type="checkbox"
                        checked={spec.exactOnly}
                        onChange={(ev) => updatePlanSpec(product.id, { exactOnly: ev.target.checked })}
                      />
                      <span>
                        <strong>Restringir à seleção</strong> — se desmarcado, lista vazia significa todas as
                        modalidades cadastradas na unidade.
                      </span>
                    </label>
                    {unitMods.length === 0 ? (
                      <p className="plans-empty-mods">
                        Cadastre modalidades em <Link to="/dados-cadastrais">Dados cadastrais</Link>.
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
                                updatePlanSpec(product.id, {
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
                    <PlanRepasseBreakdown planId={product.id} studentPrice={product.pricePerMonth} />
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
        {savedFlash && <span className="plans-saved">Alterações salvas.</span>}
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
