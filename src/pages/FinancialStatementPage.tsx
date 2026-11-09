import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { platformFeeFromGross } from '../data/connectFees';
import { monthKeyFromDate } from '../data/financialForecast';
import {
  defaultStatementMonthIndex,
  enrichedConsolidatedPayoutHistory,
  listStatementMonths,
  payoutAtStatementIndex,
  resolveOpenMonthPayout,
} from '../data/payoutHistory';
import { payoutGrossSummary } from '../data/payoutGross';
import {
  buildStatementClosingDetail,
  statementFeePercentLabel,
} from '../data/statementAnalytics';
import {
  portalFeePolicyFromView,
  resolveConnectFeePercentForUnit,
  resolveDailyFeePercentForUnit,
} from '../data/platformFeePolicy';
import { usePortal } from '../portalContext';
import { connectPlanName, formatBRL } from '../types';
import './FinancialStatementPage.css';

export function FinancialStatementPage() {
  const { state, unit, isAllUnits } = usePortal();
  const { payout: currentPayout, payoutsByUnit: currentPayoutsByUnit, units, payoutHistoryByUnit } = state;
  const [searchParams, setSearchParams] = useSearchParams();
  const detailRef = useRef<HTMLElement>(null);

  const historyUnitIds = isAllUnits ? units.map((u) => u.id) : [state.activeUnitId];
  const monthOptions = useMemo(
    () => listStatementMonths(payoutHistoryByUnit, historyUnitIds),
    [payoutHistoryByUnit, historyUnitIds],
  );
  const maxIndex = Math.max(0, monthOptions.length - 1);
  const anchorKey = monthKeyFromDate(new Date());

  const defaultIndex = useMemo(
    () => (monthOptions.length ? defaultStatementMonthIndex(monthOptions) : 0),
    [monthOptions],
  );

  const indexFromUrl = useMemo(() => {
    const raw = searchParams.get('mes')?.trim();
    if (!raw || monthOptions.length === 0) return defaultIndex;
    if (/^\d{4}-\d{2}$/.test(raw)) {
      const found = monthOptions.findIndex((o) => o.monthKey === raw);
      if (found >= 0) return found;
    }
    const legacy = parseInt(raw, 10);
    if (!Number.isNaN(legacy) && legacy >= 0 && legacy <= maxIndex) {
      return legacy;
    }
    return defaultIndex;
  }, [searchParams, monthOptions, defaultIndex, maxIndex]);

  const [monthIndex, setMonthIndex] = useState(indexFromUrl);

  useEffect(() => {
    setMonthIndex(indexFromUrl);
  }, [indexFromUrl, historyUnitIds.join(',')]);

  const selectedOption = monthOptions[monthIndex];
  const isFutureMonth = selectedOption ? selectedOption.monthKey > anchorKey : false;

  const rawPayout = useMemo(() => {
    if (!selectedOption) {
      return { payout: currentPayout, payoutsByUnit: currentPayoutsByUnit };
    }
    return payoutAtStatementIndex(
      payoutHistoryByUnit,
      historyUnitIds,
      selectedOption,
      anchorKey,
      currentPayoutsByUnit,
    );
  }, [
    selectedOption,
    payoutHistoryByUnit,
    historyUnitIds,
    anchorKey,
    currentPayoutsByUnit,
    currentPayout,
  ]);

  const payout = useMemo(() => {
    if (isFutureMonth) return rawPayout.payout;
    return resolveOpenMonthPayout(
      rawPayout.payout,
      state.students,
      historyUnitIds,
      payoutHistoryByUnit,
      currentPayoutsByUnit,
    );
  }, [
    isFutureMonth,
    rawPayout.payout,
    state.students,
    historyUnitIds,
    payoutHistoryByUnit,
    currentPayoutsByUnit,
  ]);

  const payoutsByUnit = useMemo(() => {
    if (isFutureMonth) return rawPayout.payoutsByUnit;
    return Object.fromEntries(
      Object.entries(rawPayout.payoutsByUnit).map(([id, p]) => [
        id,
        resolveOpenMonthPayout(p, state.students, [id], payoutHistoryByUnit, currentPayoutsByUnit),
      ]),
    );
  }, [
    isFutureMonth,
    rawPayout.payoutsByUnit,
    state.students,
    payoutHistoryByUnit,
    currentPayoutsByUnit,
  ]);

  const gross = payoutGrossSummary(payout);

  const statementCtx = useMemo(
    () => ({
      units: state.units,
      policy: portalFeePolicyFromView(state),
      activeUnitId: state.activeUnitId,
      isAllUnits,
    }),
    [
      state.units,
      state.activeUnitId,
      state.defaultConnectFeePercent,
      state.defaultDailyFeePercent,
      state.networkConnectFeePercentOverride,
      state.networkDailyFeePercentOverride,
      isAllUnits,
    ],
  );

  const feeSummary = useMemo(
    () => statementFeePercentLabel(statementCtx, payoutsByUnit),
    [statementCtx, payoutsByUnit],
  );

  const closing = useMemo(
    () => buildStatementClosingDetail(payout, payoutsByUnit, statementCtx),
    [payout, payoutsByUnit, statementCtx],
  );

  const connectPlanFeePct =
    closing.closingRows.find((r) => r.id === 'connect-plan')?.feePercentApplied ??
    resolveConnectFeePercentForUnit(unit, portalFeePolicyFromView(state));
  const historyRows = useMemo(
    () =>
      enrichedConsolidatedPayoutHistory(
        payoutHistoryByUnit,
        historyUnitIds,
        state.students,
        currentPayoutsByUnit,
        monthOptions,
        anchorKey,
      ),
    [payoutHistoryByUnit, historyUnitIds, state.students, currentPayoutsByUnit, monthOptions, anchorKey],
  );

  const selectMonth = (index: number, scrollToDetail = false) => {
    const next = Math.min(Math.max(0, index), maxIndex);
    setMonthIndex(next);
    const key = monthOptions[next]?.monthKey;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (key && next === defaultIndex) {
          p.delete('mes');
        } else if (key) {
          p.set('mes', key);
        }
        return p;
      },
      { replace: true },
    );
    if (scrollToDetail) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const statusClass =
    payout.status === 'paid'
      ? 'badge badge-paid'
      : payout.status === 'processing'
        ? 'badge badge-processing'
        : 'badge badge-open';

  const statusLabel =
    payout.status === 'paid' ? 'Pago' : payout.status === 'processing' ? 'Em processamento' : 'Em aberto';

  const selectedLabel = selectedOption?.monthLabel ?? payout.monthLabel;

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header className="statement-header">
        <div>
          <h1 className="page-title">Extrato financeiro</h1>
          <p className="page-subtitle">
            Totais de diárias (valor da visita) e de planos (aluno + benefício corporativo), sem dedução da
            taxa da plataforma no extrato.
            No saque, aplicamos a taxa vigente por tipo (diárias e planos podem ter percentuais distintos),
            conforme Configurações e overrides da rede/unidade — inclusive sobre diárias.
          </p>
        </div>
        {monthOptions.length > 0 && (
          <div className="statement-month-picker">
            <span className="statement-month-label" id="statement-month-label">
              Mês de referência
            </span>
            <div className="statement-month-controls">
              <button
                type="button"
                className="btn btn-secondary statement-month-nav"
                aria-label="Mês anterior"
                disabled={monthIndex <= 0}
                onClick={() => selectMonth(monthIndex - 1, true)}
              >
                ‹
              </button>
              <select
                id="statement-month-select"
                className="statement-month-select"
                aria-labelledby="statement-month-label"
                value={monthIndex}
                onChange={(e) => selectMonth(parseInt(e.target.value, 10), true)}
              >
                {monthOptions.map((m) => (
                  <option key={m.monthKey} value={m.index}>
                    {m.monthLabel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary statement-month-nav"
                aria-label="Próximo mês"
                disabled={monthIndex >= maxIndex}
                onClick={() => selectMonth(monthIndex + 1, true)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="card">
        <div className="statement-summary-head">
          <div>
            <h2 className="section-title">{selectedLabel || payout.monthLabel}</h2>
            <span className={statusClass}>{statusLabel}</span>
            {payout.status === 'paid' ? (
              <p className="statement-archived-hint">Período fechado · somente leitura</p>
            ) : null}
            {isFutureMonth ? (
              <p className="statement-archived-hint">Projeção futura · valores zerados até o mês começar</p>
            ) : null}
          </div>
          <div className="statement-summary-total">
            <div className="statement-summary-value">{formatBRL(gross.totalGross)}</div>
            <div className="page-subtitle">Total bruto no período</div>
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 24 }}>
          <div className="stat-card">
            <div className="value">{formatBRL(gross.dailyGross)}</div>
            <div className="label">Diárias · valor pago pelos alunos</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(gross.connectGross)}</div>
            <div className="label">Planos · valor dos planos</div>
          </div>
        </div>
      </div>

      <section ref={detailRef} className="card statement-detail-card" id="statement-detail">
        <div className="statement-detail-head">
          <h2 className="section-title">Fechamento analítico · {selectedLabel}</h2>
          <p className="page-subtitle statement-detail-hint">
            Detalhamento de tudo que compõe este período: diárias, planos, benefício corporativo, taxa da plataforma
            e repasse líquido.
          </p>
        </div>

        <div className="table-wrap statement-detail-table-wrap">
          <table className="data-table statement-closing-table">
            <thead>
              <tr>
                <th>Linha do fechamento</th>
                <th>Bruto</th>
                <th>Taxa da plataforma</th>
                <th>Repasse líquido</th>
              </tr>
            </thead>
            <tbody>
              {closing.closingRows.map((row) => (
                <tr key={row.id} className={row.emphasis ? 'statement-closing-total-row' : undefined}>
                  <td>
                    <strong>{row.label}</strong>
                    {row.detail ? <span className="statement-row-detail">{row.detail}</span> : null}
                  </td>
                  <td>{formatBRL(row.gross)}</td>
                  <td>
                    {formatBRL(row.platformFee)}
                    <span className="statement-row-detail"> ({row.feePercentApplied}%)</span>
                  </td>
                  <td>{formatBRL(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="statement-subsection-title">Planos por tipo · {selectedLabel}</h3>
        <div className="table-wrap statement-detail-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plano</th>
                <th>Assíduos</th>
                <th>Check-ins</th>
                <th>Plano aluno</th>
                <th>Benefício corp.</th>
                <th>Total bruto</th>
                <th>Taxa da plataforma ({connectPlanFeePct}%)</th>
                <th>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {closing.planRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--text-muted)' }}>
                    Nenhum plano neste período.
                  </td>
                </tr>
              )}
              {closing.planRows.map((line) => (
                <tr key={line.connectPlanId}>
                  <td>{connectPlanName(line.connectPlanId)}</td>
                  <td>{line.activeMembers}</td>
                  <td>{line.checkIns}</td>
                  <td>{formatBRL(line.planPrice)}</td>
                  <td>{formatBRL(line.corporatePerMember)}</td>
                  <td>{formatBRL(line.lineGross)}</td>
                  <td>{formatBRL(line.platformFee)}</td>
                  <td>{formatBRL(line.lineNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="statement-subsection-title">
          Diárias · {closing.dailySalesCount} lançamento{closing.dailySalesCount === 1 ? '' : 's'}
        </h3>
        <div className="table-wrap statement-detail-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Comprador</th>
                <th>Valor da diária</th>
                <th>Taxa (por venda)</th>
                <th>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {closing.dailySales.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                    Nenhuma diária neste mês.
                  </td>
                </tr>
              )}
              {closing.dailySales.map((sale) => {
                const saleUnit = sale.unitId
                  ? state.units.find((u) => u.id === sale.unitId)
                  : unit;
                const pct = resolveDailyFeePercentForUnit(saleUnit, statementCtx.policy);
                const fee = platformFeeFromGross(sale.gross, pct);
                const net = sale.gross - fee;
                return (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                    <td>{sale.studentName}</td>
                    <td>{formatBRL(sale.gross)}</td>
                    <td>
                      {formatBRL(fee)}
                      <span className="statement-row-detail"> ({pct}%)</span>
                    </td>
                    <td>{formatBRL(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="statement-detail-foot">
          <div className="statement-detail-foot-item">
            <span>Total bruto</span>
            <strong>{formatBRL(closing.totals.totalGross)}</strong>
          </div>
          <div className="statement-detail-foot-item">
            <span>Taxa da plataforma ({feeSummary})</span>
            <strong>{formatBRL(closing.totals.totalPlatformFee)}</strong>
          </div>
          <div className="statement-detail-foot-item statement-detail-foot-total">
            <span>Repasse líquido estimado</span>
            <strong>{formatBRL(closing.totals.totalNet)}</strong>
          </div>
        </div>
      </section>

      {isAllUnits && (
        <div className="card">
          <h2 className="section-title">Extrato por unidade · {selectedLabel}</h2>
          <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Diárias</th>
                  <th>Planos alunos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const p = payoutsByUnit[u.id];
                  if (!p) return null;
                  const unitGross = payoutGrossSummary(p);
                  return (
                    <tr key={u.id}>
                      <td>{u.unitName}</td>
                      <td>{formatBRL(unitGross.dailyGross)}</td>
                      <td>{formatBRL(unitGross.connectGross)}</td>
                      <td>{formatBRL(unitGross.totalGross)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historyRows.length > 0 && (
        <div className="card">
          <h2 className="section-title">Linha do tempo · {historyRows.length} períodos</h2>
          <p className="page-subtitle statement-history-hint">
            Clique em um período para abrir o extrato analítico (passado, mês atual ou meses futuros
            projetados).
          </p>
          <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Diárias</th>
                  <th>Planos</th>
                  <th>Total bruto</th>
                  <th>Líquido</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, rowIndex) => {
                  const selected = rowIndex === monthIndex;
                  const rowKey = monthOptions[rowIndex]?.monthKey ?? row.monthLabel;
                  return (
                    <tr
                      key={rowKey}
                      className={selected ? 'statement-history-row-active' : 'statement-history-row'}
                      onClick={() => selectMonth(rowIndex, true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectMonth(rowIndex, true);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`Ver extrato de ${row.monthLabel}`}
                    >
                      <td>{row.monthLabel}</td>
                      <td>{formatBRL(row.dailyGross)}</td>
                      <td>{formatBRL(row.connectGross)}</td>
                      <td>{formatBRL(row.totalGross)}</td>
                      <td>{formatBRL(row.totalNet)}</td>
                      <td>
                        <span
                          className={
                            row.status === 'paid'
                              ? 'badge badge-paid'
                              : row.status === 'processing'
                                ? 'badge badge-processing'
                                : 'badge badge-open'
                          }
                        >
                          {row.status === 'paid' ? 'Fechado' : row.status === 'processing' ? 'Processando' : 'Em aberto'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated rota antiga */
export const PayoutsPage = FinancialStatementPage;
