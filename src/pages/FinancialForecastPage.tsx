import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { formatChangePercent } from '../data/dashboardImpact';
import { ACAF_CONNECT_FEE_PERCENT } from '../data/acafFees';
import {
  buildFinancialForecast,
  FORECAST_FUTURE_MONTHS,
  shortMonthLabelFromKey,
  type ForecastKpiComparison,
  type MonthScenarioCell,
} from '../data/financialForecast';
import { scopeSummary } from '../data/unitScope';
import { usePortal } from '../portalContext';
import { formatBRL } from '../types';
import './FinancialForecastPage.css';

function kindClass(kind: MonthScenarioCell['kind']): string {
  if (kind === 'confirmed') return 'forecast-month--confirmed';
  if (kind === 'open') return 'forecast-month--open';
  if (kind === 'nodata') return 'forecast-month--nodata';
  return 'forecast-month--forecast';
}

function formatCellMoney(cell: MonthScenarioCell, value: number): string {
  if (cell.kind === 'nodata') return '—';
  return formatBRL(value);
}

function ForecastStatChange({ comparison }: { comparison: ForecastKpiComparison }) {
  if (comparison.changePercent === null) {
    return (
      <p className="forecast-stat-change forecast-stat-change--muted">
        Sem período anterior para comparar
      </p>
    );
  }
  const up = comparison.changePercent >= 0;
  return (
    <p
      className={`forecast-stat-change ${up ? 'forecast-stat-change--up' : 'forecast-stat-change--down'}`}
    >
      {formatChangePercent(comparison.changePercent)} vs {comparison.periodLabel}
    </p>
  );
}

function TimelineMonthHeader({ cell }: { cell: MonthScenarioCell }) {
  const isAnchor = cell.kind === 'open';
  return (
    <th
      className={`forecast-timeline-month ${kindClass(cell.kind)}${isAnchor ? ' forecast-timeline-month--current' : ''}`}
    >
      <span className="forecast-timeline-month-label">{cell.monthLabel}</span>
      <span className={`forecast-timeline-kind badge forecast-kind-badge--${cell.kind}`}>
        {cell.statusLabel}
      </span>
    </th>
  );
}

export function FinancialForecastPage() {
  const { state, isAllUnits } = usePortal();
  const unitIds = isAllUnits ? state.units.map((u) => u.id) : [state.activeUnitId];

  const report = useMemo(
    () =>
      buildFinancialForecast(
        state.units,
        state.students,
        state.payoutHistoryByUnit,
        state.payoutsByUnit,
        unitIds,
      ),
    [
      state.units,
      state.students,
      state.payoutHistoryByUnit,
      state.payoutsByUnit,
      unitIds.join(','),
    ],
  );

  const { totals, timeline, kpiComparisons } = report;
  const scopeLabel = isAllUnits
    ? scopeSummary(state)
    : state.units.find((u) => u.id === unitIds[0])?.unitName;

  const nextForecastMonth = timeline.find(
    (m) => m.monthKey > report.anchorMonthKey && m.kind === 'forecast',
  );
  const confirmedMonths = timeline.filter((m) => m.kind === 'confirmed' || m.kind === 'open');
  const confirmedTotal = confirmedMonths
    .filter((m) => m.kind === 'confirmed')
    .reduce((a, m) => a + m.totalGross, 0);
  const forecastTotal = timeline
    .filter((m) => m.kind === 'forecast')
    .reduce((a, m) => a + m.totalGross, 0);

  return (
    <div className="page-stack forecast-page">
      <UnitScopeBanner />
      <header className="forecast-header">
        <div>
          <h1 className="page-title">Previsão financeira</h1>
          <p className="page-subtitle">
            Meses com extrato na base (confirmados ou em aberto) e {FORECAST_FUTURE_MONTHS} meses
            futuros projetados. Não exibimos meses sem movimentação no{' '}
            <Link to="/financeiro/extrato">extrato</Link>. Valores brutos; taxa ACAF (
            {ACAF_CONNECT_FEE_PERCENT}%) no saque.
          </p>
        </div>
      </header>

      <div className="stat-grid forecast-summary-grid">
        <div className="stat-card forecast-stat-card forecast-stat-card--primary">
          <div className="value">
            {nextForecastMonth ? formatBRL(nextForecastMonth.totalGross) : formatBRL(totals.totalGrossMonth)}
          </div>
          <div className="label">Próximo mês · previsão bruta</div>
          <p className="forecast-stat-hint">
            {nextForecastMonth?.monthLabel ?? scopeLabel}
          </p>
          <ForecastStatChange comparison={kpiComparisons.nextMonth} />
        </div>
        <div className="stat-card forecast-stat-card">
          <div className="value">{formatBRL(confirmedTotal)}</div>
          <div className="label">Confirmado · {confirmedMonths.filter((m) => m.kind === 'confirmed').length} meses</div>
          <p className="forecast-stat-hint">Só meses fechados com extrato</p>
          <ForecastStatChange comparison={kpiComparisons.confirmed} />
        </div>
        <div className="stat-card forecast-stat-card">
          <div className="value">{formatBRL(forecastTotal)}</div>
          <div className="label">Previsão · {FORECAST_FUTURE_MONTHS} meses</div>
          <p className="forecast-stat-hint">Expectativa recorrente projetada</p>
          <ForecastStatChange comparison={kpiComparisons.forecastSixMonths} />
        </div>
        <div className="stat-card forecast-stat-card">
          <div className="value">{formatBRL(totals.totalNetMonth)}</div>
          <div className="label">Líquido · mês tipo</div>
          <p className="forecast-stat-hint">~{100 - report.feePercent}% após taxa ACAF</p>
          <ForecastStatChange comparison={kpiComparisons.netTypical} />
        </div>
      </div>

      <div className="card forecast-timeline-card">
        <div className="forecast-timeline-head">
          <h2 className="section-title">Linha do tempo · {scopeLabel}</h2>
          <div className="forecast-timeline-legend" aria-hidden="true">
            <span className="forecast-legend-item">
              <span className="forecast-legend-swatch forecast-legend-swatch--confirmed" />
              Confirmado
            </span>
            <span className="forecast-legend-item">
              <span className="forecast-legend-swatch forecast-legend-swatch--open" />
              Em aberto
            </span>
            <span className="forecast-legend-item">
              <span className="forecast-legend-swatch forecast-legend-swatch--forecast" />
              Previsão
            </span>
          </div>
        </div>

        <div className="forecast-timeline-scroll">
          <table className="data-table forecast-timeline-table">
            <thead>
              <tr>
                <th className="forecast-timeline-sticky">Indicador</th>
                {timeline.map((cell) => (
                  <TimelineMonthHeader key={cell.monthKey} cell={cell} />
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="forecast-timeline-sticky">Planos (bruto)</th>
                {timeline.map((cell) => (
                  <td key={cell.monthKey} className={kindClass(cell.kind)}>
                    {formatCellMoney(cell, cell.connectGross)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="forecast-timeline-sticky">Diárias (bruto)</th>
                {timeline.map((cell) => (
                  <td key={cell.monthKey} className={kindClass(cell.kind)}>
                    {formatCellMoney(cell, cell.dailyGross)}
                  </td>
                ))}
              </tr>
              <tr className="forecast-timeline-total-row">
                <th className="forecast-timeline-sticky">Total bruto</th>
                {timeline.map((cell) => (
                  <td key={cell.monthKey} className={kindClass(cell.kind)}>
                    <strong>{formatCellMoney(cell, cell.totalGross)}</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="forecast-timeline-sticky">Líquido est.</th>
                {timeline.map((cell) => (
                  <td key={cell.monthKey} className={`forecast-net-cell ${kindClass(cell.kind)}`}>
                    {formatCellMoney(cell, cell.totalNet)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card forecast-method-card">
        <h2 className="section-title">Como calculamos</h2>
        <ul className="forecast-method-list">
            <li>
              <strong>Em aberto / previsão:</strong> mês atual com diárias realizadas e planos
              previstos dos associados com academia principal nesta rede (repasse garantido).
            </li>
            <li>
              <strong>Previsão:</strong> {FORECAST_FUTURE_MONTHS} meses após o mês atual — assínuos
              com academia principal + média de diárias.
            </li>
          <li>
            <strong>Sem dados:</strong> meses anteriores ao início do extrato não são estimados nem
            exibidos.
          </li>
        </ul>
      </div>

      {isAllUnits ? (
        <div className="card">
          <h2 className="section-title">Total bruto por unidade · linha do tempo</h2>
          <div className="forecast-timeline-scroll">
            <table className="data-table forecast-timeline-table forecast-unit-timeline">
              <thead>
                <tr>
                  <th className="forecast-timeline-sticky">Unidade</th>
                  {timeline.map((cell) => (
                    <th key={cell.monthKey} className={kindClass(cell.kind)}>
                      {shortMonthLabelFromKey(cell.monthKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.units.map((unit) => (
                  <tr key={unit.unitId}>
                    <th className="forecast-timeline-sticky">{unit.unitName}</th>
                    {unit.timeline.map((cell) => (
                      <td key={cell.monthKey} className={kindClass(cell.kind)}>
                        {formatCellMoney(cell, cell.totalGross)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="forecast-total-row">
                  <th className="forecast-timeline-sticky">Total rede</th>
                  {timeline.map((cell) => (
                    <td key={cell.monthKey} className={kindClass(cell.kind)}>
                      <strong>{formatCellMoney(cell, cell.totalGross)}</strong>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2 className="section-title">
          {isAllUnits ? 'Parâmetros por unidade' : `Parâmetros · ${scopeLabel}`}
        </h2>
        <div className="table-wrap forecast-table-wrap">
          <table className="data-table forecast-table">
            <thead>
              <tr>
                {isAllUnits ? <th>Unidade</th> : null}
                <th>Assíduos</th>
                <th>Planos/mês (prev.)</th>
                <th>Média diárias/mês</th>
                <th>Ticket médio</th>
                <th>Diárias/mês (prev.)</th>
                <th>Total tipo/mês</th>
              </tr>
            </thead>
            <tbody>
              {report.units.map((row) => (
                <tr key={row.unitId}>
                  {isAllUnits ? <td>{row.unitName}</td> : null}
                  <td>{row.connectMembers}</td>
                  <td>{formatBRL(row.connectGrossMonth)}</td>
                  <td>{row.avgDailiesPerMonth}</td>
                  <td>{formatBRL(row.avgDailyTicket)}</td>
                  <td>{formatBRL(row.dailyGrossMonth)}</td>
                  <td>{formatBRL(row.totalGrossMonth)}</td>
                </tr>
              ))}
              {isAllUnits && report.units.length > 1 ? (
                <tr className="forecast-total-row">
                  <td><strong>Total rede</strong></td>
                  <td><strong>{totals.connectMembers}</strong></td>
                  <td><strong>{formatBRL(totals.connectGrossMonth)}</strong></td>
                  <td><strong>{totals.avgDailiesPerMonth}</strong></td>
                  <td><strong>{formatBRL(totals.avgDailyTicket)}</strong></td>
                  <td><strong>{formatBRL(totals.dailyGrossMonth)}</strong></td>
                  <td><strong>{formatBRL(totals.totalGrossMonth)}</strong></td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
