import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { ACAF_CONNECT_FEE_PERCENT, acafFeeFromGross } from '../data/acafFees';
import {
  consolidatedPayoutHistory,
  listStatementMonths,
  payoutAtHistoryIndex,
} from '../data/payoutHistory';
import { payoutGrossSummary } from '../data/payoutGross';
import {
  buildStatementClosingDetail,
  statementFeePercentLabel,
} from '../data/statementAnalytics';
import { usePortal } from '../portalContext';
import { connectPlanName, formatBRL } from '../types';
import './FinancialStatementPage.css';

function clampMonthIndex(index: number, max: number): number {
  if (max < 0) return 0;
  return Math.min(Math.max(0, index), max);
}

export function FinancialStatementPage() {
  const { state, isAllUnits } = usePortal();
  const { payout: currentPayout, payoutsByUnit: currentPayoutsByUnit, units, payoutHistoryByUnit } = state;
  const [searchParams, setSearchParams] = useSearchParams();
  const detailRef = useRef<HTMLElement>(null);

  const historyUnitIds = isAllUnits ? units.map((u) => u.id) : [state.activeUnitId];
  const monthOptions = useMemo(
    () => listStatementMonths(payoutHistoryByUnit, historyUnitIds),
    [payoutHistoryByUnit, historyUnitIds],
  );
  const maxIndex = Math.max(0, monthOptions.length - 1);

  const indexFromUrl = (() => {
    const raw = searchParams.get('mes');
    if (raw == null || raw === '') return maxIndex;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return maxIndex;
    return clampMonthIndex(n, maxIndex);
  })();

  const [monthIndex, setMonthIndex] = useState(indexFromUrl);

  useEffect(() => {
    setMonthIndex(indexFromUrl);
  }, [indexFromUrl, historyUnitIds.join(',')]);

  const useHistory = monthOptions.length > 0;
  const { payout, payoutsByUnit } = useHistory
    ? payoutAtHistoryIndex(payoutHistoryByUnit, historyUnitIds, monthIndex)
    : { payout: currentPayout, payoutsByUnit: currentPayoutsByUnit };

  const gross = payoutGrossSummary(payout);
  const closing = useMemo(
    () => buildStatementClosingDetail(payout, payoutsByUnit),
    [payout, payoutsByUnit],
  );
  const historyRows = consolidatedPayoutHistory(payoutHistoryByUnit, historyUnitIds);

  const selectMonth = (index: number, scrollToDetail = false) => {
    const next = clampMonthIndex(index, maxIndex);
    setMonthIndex(next);
    if (monthOptions.length > 1) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === maxIndex) p.delete('mes');
          else p.set('mes', String(next));
          return p;
        },
        { replace: true },
      );
    }
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

  const selectedLabel = monthOptions.find((m) => m.index === monthIndex)?.monthLabel ?? payout.monthLabel;

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header className="statement-header">
        <div>
          <h1 className="page-title">Extrato financeiro</h1>
          <p className="page-subtitle">
            Totais de diárias (valor da visita) e de planos (aluno + benefício corporativo), sem dedução da
            taxa ACAF no extrato.
            No saque, descontamos {ACAF_CONNECT_FEE_PERCENT}% sobre cada valor — inclusive diárias.
          </p>
        </div>
        {monthOptions.length > 1 && (
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
                  <option key={m.index} value={m.index}>
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
            {monthIndex < maxIndex && (
              <p className="statement-archived-hint">Extrato fechado · somente leitura</p>
            )}
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
            Detalhamento de tudo que compõe este período: diárias, planos, benefício corporativo, taxa ACAF
            e repasse líquido.
          </p>
        </div>

        <div className="table-wrap statement-detail-table-wrap">
          <table className="data-table statement-closing-table">
            <thead>
              <tr>
                <th>Linha do fechamento</th>
                <th>Bruto</th>
                <th>Taxa ACAF ({statementFeePercentLabel()})</th>
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
                  <td>{formatBRL(row.acafFee)}</td>
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
                <th>Taxa ACAF</th>
                <th>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {closing.planRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--text-muted)' }}>
                    Nenhum plano Connect neste período.
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
                  <td>{formatBRL(line.acafFee)}</td>
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
                <th>Taxa ACAF ({ACAF_CONNECT_FEE_PERCENT}%)</th>
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
                const fee =
                  sale.feePercent === ACAF_CONNECT_FEE_PERCENT
                    ? sale.gross - sale.net
                    : acafFeeFromGross(sale.gross);
                const net =
                  sale.feePercent === ACAF_CONNECT_FEE_PERCENT ? sale.net : sale.gross - fee;
                return (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                    <td>{sale.studentName}</td>
                    <td>{formatBRL(sale.gross)}</td>
                    <td>{formatBRL(fee)}</td>
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
            <span>Taxa ACAF ({statementFeePercentLabel()})</span>
            <strong>{formatBRL(closing.totals.totalAcafFee)}</strong>
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
          <h2 className="section-title">Histórico · últimos {historyRows.length} meses</h2>
          <p className="page-subtitle statement-history-hint">
            Clique em um período para abrir o extrato analítico daquele mês.
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
                  return (
                    <tr
                      key={row.monthLabel}
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
