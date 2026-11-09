import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { PixDestinationField } from '../components/PixDestinationField';
import { platformFeeFromGross } from '../data/connectFees';
import { portalFeePolicyFromView } from '../data/platformFeePolicy';
import {
  amountFromDigitStream,
  formatBrlInputDigits,
  roundBrlAmount,
} from '../data/currencyInput';
import {
  defaultPayoutMethod,
  loadPayoutMethods,
  payoutMethodSummary,
  type PayoutMethod,
} from '../data/payoutMethods';
import {
  computeWithdrawalEligibility,
  grossFromNet,
  isWithdrawalPending,
} from '../data/withdrawalEligibility';
import {
  WITHDRAWAL_FLOW_STEP_LABELS,
  withdrawalStatusUi,
  withdrawalStepIndices,
} from '../data/withdrawalStatus';
import { scopeSummary } from '../data/unitScope';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import { formatBRL } from '../types';
import './WithdrawalsPage.css';

type WithdrawalRow = {
  id: string;
  createdAt: string;
  amount: number;
  grossAmount: number;
  platformFee: number;
  payoutMethodId: string;
  note?: string;
  status: 'registered' | 'processing' | 'paid' | 'cancelled';
  unitLabel: string;
};

function loadWithdrawals(): WithdrawalRow[] {
  return [];
}

function saveWithdrawals(_rows: WithdrawalRow[]) {
  /* Saques persistidos na API quando o endpoint estiver disponível. */
}

function formatTagPlayPercent(rate: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function WithdrawalsPage() {
  const flash = useFlash();
  const { state, unit, isAllUnits } = usePortal();
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>(() => loadPayoutMethods());
  const [withdrawals, setWithdrawals] = useState(() => loadWithdrawals());
  const [selectedPayoutMethodId, setSelectedPayoutMethodId] = useState(
    () => defaultPayoutMethod(loadPayoutMethods())?.id ?? '',
  );
  const [amountDisplay, setAmountDisplay] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const methods = loadPayoutMethods();
    setPayoutMethods(methods);
    setSelectedPayoutMethodId((current) => {
      if (current && methods.some((m) => m.id === current)) return current;
      return defaultPayoutMethod(methods)?.id ?? '';
    });
  }, []);

  const historyUnitIds = isAllUnits ? state.units.map((u) => u.id) : [state.activeUnitId];

  const pendingWithdrawalsGross = useMemo(
    () =>
      withdrawals
        .filter((w) => isWithdrawalPending(w.status))
        .reduce((a, w) => a + w.grossAmount, 0),
    [withdrawals],
  );

  const eligibility = useMemo(
    () =>
      computeWithdrawalEligibility(
        state.payoutHistoryByUnit,
        historyUnitIds,
        pendingWithdrawalsGross,
        state.units,
        portalFeePolicyFromView(state),
      ),
    [
      state.payoutHistoryByUnit,
      historyUnitIds,
      pendingWithdrawalsGross,
      state.units,
      state.defaultConnectFeePercent,
      state.defaultDailyFeePercent,
      state.networkConnectFeePercentOverride,
      state.networkDailyFeePercentOverride,
    ],
  );

  const noPixDestination = payoutMethods.length === 0 || !selectedPayoutMethodId;
  const formDisabled = eligibility.availableForWithdrawal <= 0 || noPixDestination;

  const parseAmount = (raw = amountDisplay): number => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return NaN;
    return amountFromDigitStream(digits);
  };

  const onAmountInput = (ev: ChangeEvent<HTMLInputElement>) => {
    let digits = ev.target.value.replace(/\D/g, '').slice(0, 14);
    if (!digits) {
      setAmountDisplay('');
      ev.target.value = '';
      return;
    }
    const formatted = formatBrlInputDigits(amountFromDigitStream(digits));
    setAmountDisplay(formatted);
    ev.target.value = formatted;
    const len = ev.target.value.length;
    queueMicrotask(() => ev.target.setSelectionRange(len, len));
  };

  const onAmountBlur = (ev: FocusEvent<HTMLInputElement>) => {
    if (!ev.target.value.replace(/\D/g, '')) {
      setAmountDisplay('');
      ev.target.value = '';
    }
  };

  const resetAmountField = () => {
    setAmountDisplay('');
    queueMicrotask(() => {
      if (amountInputRef.current) amountInputRef.current.value = '';
    });
  };

  const submitWithdrawal = () => {
    setError('');

    const payoutMethodId = selectedPayoutMethodId;
    if (!payoutMethodId) {
      setError('Cadastre e selecione uma chave Pix em Chaves Pix.');
      return;
    }

    const netAmount = roundBrlAmount(parseAmount());
    if (!Number.isFinite(netAmount) || netAmount <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    const cents = (n: number) => Math.round(n * 100);
    if (cents(netAmount) < cents(eligibility.minWithdrawalAmount)) {
      setError(`Valor mínimo para saque: ${formatBRL(eligibility.minWithdrawalAmount)}.`);
      return;
    }
    if (
      eligibility.maxWithdrawalAmount != null &&
      cents(netAmount) > cents(eligibility.maxWithdrawalAmount)
    ) {
      setError(`Valor máximo por solicitação: ${formatBRL(eligibility.maxWithdrawalAmount)}.`);
      return;
    }
    if (cents(netAmount) > cents(eligibility.availableForWithdrawal)) {
      setError(`Saldo disponível para saque: ${formatBRL(eligibility.availableForWithdrawal)}.`);
      return;
    }

    setSubmitting(true);
    const grossAmount = grossFromNet(netAmount, eligibility.platformFeeRateApplied);
    const row: WithdrawalRow = {
      id: `w-${Date.now()}`,
      createdAt: new Date().toISOString(),
      amount: netAmount,
      grossAmount,
      platformFee: platformFeeFromGross(grossAmount, eligibility.platformFeeRateApplied),
      payoutMethodId,
      note: note.trim() || undefined,
      status: 'registered',
      unitLabel: isAllUnits ? scopeSummary(state) : unit.unitName,
    };
    const next = [row, ...withdrawals];
    setWithdrawals(next);
    saveWithdrawals(next);
    setSubmitting(false);
    resetAmountField();
    setNote('');
    flash.success('Saque registrado. Acompanhe o andamento na lista abaixo.');
  };

  const destinationLabel = (methodId: string) => {
    const method = payoutMethods.find((m) => m.id === methodId);
    return method ? payoutMethodSummary(method) : '—';
  };

  return (
    <div className="page-stack withdrawals-page">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Saques</h1>
        <p className="page-subtitle">
          Solicite repasse via Pix com base no{' '}
          <Link to="/financeiro/extrato">extrato financeiro</Link>. Cadastre destinos em{' '}
          <Link to="/financeiro/chaves-pix">Chaves Pix</Link>. A taxa da plataforma (média ponderada{' '}
          {formatTagPlayPercent(eligibility.platformFeeRateApplied)}% neste escopo) já entra no cálculo do
          saldo disponível.
        </p>
      </header>

      <section className="withdrawals-section" aria-labelledby="withdrawals-new-title">
        <h2 id="withdrawals-new-title" className="withdrawals-section-title">
          <span className="withdrawals-section-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          Novo saque
        </h2>

        <p className="withdrawals-pix-hint">
          Selecione uma das chaves já cadastradas. Para incluir ou editar destinos, use{' '}
          <Link to="/financeiro/chaves-pix">Chaves Pix</Link>.
        </p>

        <form
          className="withdrawals-form card"
          onSubmit={(ev) => {
            ev.preventDefault();
            submitWithdrawal();
          }}
        >
          <div className="withdrawals-balance" aria-live="polite">
            <p className="withdrawals-balance-title">Saldo para saque</p>
            <p className="withdrawals-balance-main">
              {formatBRL(eligibility.availableForWithdrawal)}
              <span className="withdrawals-balance-label">disponível agora</span>
            </p>

            <div className="withdrawals-balance-sheet">
              <div className="withdrawals-sheet-row">
                <span className="withdrawals-sheet-label">
                  {eligibility.closedMonthLabels.length > 0
                    ? 'Meses fechados'
                    : 'Saldo bruto (confirmado)'}
                  {eligibility.closedMonthLabels.length > 0 ? (
                    <span className="withdrawals-sheet-sublabel">
                      {eligibility.closedMonthLabels.join(' · ')}
                    </span>
                  ) : null}
                </span>
                <span className="withdrawals-sheet-val">{formatBRL(eligibility.grossBalance)}</span>
              </div>
              {eligibility.platformFeeTotal > 0 ? (
                <div className="withdrawals-sheet-row withdrawals-sheet-row--minus">
                  <span className="withdrawals-sheet-label">
                    Taxa da plataforma
                    <span className="withdrawals-sheet-sublabel">
                      ({formatTagPlayPercent(eligibility.platformFeeRateApplied)}% sobre o bruto de
                      vendas)
                    </span>
                  </span>
                  <span className="withdrawals-sheet-val withdrawals-sheet-val--deduct">
                    {formatBRL(eligibility.platformFeeTotal)}
                  </span>
                </div>
              ) : null}
              <div className="withdrawals-sheet-row withdrawals-sheet-row--subtotal">
                <span className="withdrawals-sheet-label">Líquido após taxa</span>
                <span className="withdrawals-sheet-val">{formatBRL(eligibility.netAfterFee)}</span>
              </div>
              {eligibility.withdrawalsCommittedGross > 0 ? (
                <div className="withdrawals-sheet-row withdrawals-sheet-row--minus">
                  <span className="withdrawals-sheet-label">Saques em andamento</span>
                  <span className="withdrawals-sheet-val withdrawals-sheet-val--deduct">
                    {formatBRL(eligibility.withdrawalsCommittedGross)}
                  </span>
                </div>
              ) : null}
            </div>

            <p className="withdrawals-balance-limits">
              <span className="withdrawals-balance-limits-label">Por solicitação:</span>
              mín. {formatBRL(eligibility.minWithdrawalAmount)}
              {eligibility.maxWithdrawalAmount != null ? (
                <>
                  <span className="withdrawals-balance-limits-dot">·</span>
                  máx. {formatBRL(eligibility.maxWithdrawalAmount)}
                </>
              ) : null}
            </p>

            <details className="withdrawals-balance-more">
              <summary className="withdrawals-balance-more-summary">
                Detalhes técnicos do cálculo
              </summary>
              <div className="withdrawals-balance-more-body">
                <ul className="withdrawals-balance-more-list">
                  {eligibility.dailyGross > 0 ? (
                    <li>
                      <span>Diárias (bruto no extrato)</span>
                      <span className="withdrawals-balance-more-val">
                        {formatBRL(eligibility.dailyGross)}
                      </span>
                    </li>
                  ) : null}
                  {eligibility.connectGross > 0 ? (
                    <li>
                      <span>Planos alunos (bruto no extrato)</span>
                      <span className="withdrawals-balance-more-val">
                        {formatBRL(eligibility.connectGross)}
                      </span>
                    </li>
                  ) : null}
                </ul>
                <p className="withdrawals-balance-more-note">
                  O saldo considera apenas meses com fechamento confirmado no extrato. Saques já pagos
                  não aparecem na lista e não reduzem o disponível — só solicitações em andamento
                  reservam saldo.
                </p>
              </div>
            </details>
          </div>

          <div className="withdrawals-form-fields">
            <div className="field">
              <label htmlFor="withdrawal-pix">Destino (Pix)</label>
              <PixDestinationField
                id="withdrawal-pix"
                methods={payoutMethods}
                selectedMethodId={selectedPayoutMethodId}
                disabled={formDisabled}
                onSelectMethod={setSelectedPayoutMethodId}
              />
            </div>

            <div className="field">
              <label htmlFor="withdrawal-amount">Valor do saque</label>
              <div className="withdrawals-amount-field">
                <span className="withdrawals-currency-prefix" aria-hidden="true">
                  R$
                </span>
                <input
                  ref={amountInputRef}
                  id="withdrawal-amount"
                  className="withdrawals-input-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0,00"
                  disabled={formDisabled}
                  onChange={onAmountInput}
                  onBlur={onAmountBlur}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="withdrawal-note">Observação (opcional)</label>
              <input
                id="withdrawal-note"
                className="withdrawals-text-input"
                type="text"
                maxLength={500}
                value={note}
                disabled={formDisabled}
                onChange={(ev) => setNote(ev.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary withdrawals-submit"
            disabled={submitting || formDisabled}
          >
            {submitting ? 'Registrando…' : 'Registrar saque'}
          </button>

          {error ? (
            <div className="withdrawals-form-alert" role="alert">
              <p className="withdrawals-form-alert-text">{error}</p>
            </div>
          ) : null}
        </form>
      </section>

      <section className="withdrawals-section" aria-labelledby="withdrawals-list-title">
        <h2 id="withdrawals-list-title" className="withdrawals-section-title">
          Saques em andamento
        </h2>
        <p className="withdrawals-list-lead">
          Solicitações pendentes ou em processamento. Saques já pagos são removidos desta lista.
        </p>

        {withdrawals.length === 0 ? (
          <div className="withdrawals-empty card">Nenhum saque em andamento.</div>
        ) : (
          <div className="withdrawals-table-wrap card">
            <table className="withdrawals-table data-table">
              <thead>
                <tr>
                  <th>Destino</th>
                  <th>Valor</th>
                  <th>Andamento</th>
                  <th>Data</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const su = withdrawalStatusUi(w.status);
                  return (
                    <tr key={w.id}>
                      <td>{destinationLabel(w.payoutMethodId)}</td>
                      <td>{formatBRL(w.amount)}</td>
                      <td className="withdrawals-status-cell">
                        <span className={`withdrawals-badge withdrawals-badge--${su.variant}`}>
                          {su.label}
                        </span>
                        {su.stepIndex >= 0 ? (
                          <div
                            className="withdrawals-steps"
                            role="group"
                            aria-label={`Andamento: etapa ${su.stepIndex + 1} de ${su.stepTotal}`}
                          >
                            {withdrawalStepIndices(su.stepTotal).map((i) => (
                              <span
                                key={i}
                                className={`withdrawals-step${i < su.stepIndex ? ' withdrawals-step--done' : ''}${i === su.stepIndex ? ' withdrawals-step--current' : ''}`}
                                title={WITHDRAWAL_FLOW_STEP_LABELS[i]}
                              />
                            ))}
                          </div>
                        ) : null}
                        <p className="withdrawals-status-desc">{su.description}</p>
                      </td>
                      <td>
                        {new Date(w.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{w.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
