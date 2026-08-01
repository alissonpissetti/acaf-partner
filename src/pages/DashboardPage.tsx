import { Link } from 'react-router-dom';
import { CheckInsWeekChart } from '../components/dashboard/CheckInsWeekChart';
import { CompositionDonut } from '../components/dashboard/CompositionDonut';
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart';
import { UnitRevenueChart } from '../components/dashboard/UnitRevenueChart';
import '../components/dashboard/DashboardCharts.css';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import {
  buildCheckInsLastDays,
  buildCompositionSlices,
  buildRevenueTrend,
  buildUnitRevenueCompare,
  DASH_CHART_COLORS,
} from '../data/dashboardCharts';
import { buildDashboardImpact, formatChangePercent } from '../data/dashboardImpact';
import { scopeSummary } from '../data/unitScope';
import { useDashboardStats, usePortal } from '../portalContext';
import { formatBRL } from '../types';
import './DashboardPage.css';

function ChartLegend() {
  return (
    <div className="dash-chart-legend" aria-hidden="true">
      <span className="dash-chart-legend-item">
        <span className="dash-chart-legend-swatch" style={{ background: DASH_CHART_COLORS.daily }} />
        Diárias
      </span>
      <span className="dash-chart-legend-item">
        <span className="dash-chart-legend-swatch" style={{ background: DASH_CHART_COLORS.connect }} />
        Planos Connect
      </span>
    </div>
  );
}

export function DashboardPage() {
  const stats = useDashboardStats();
  const { state, isAllUnits } = usePortal();
  const unitIds = isAllUnits ? state.units.map((u) => u.id) : [state.activeUnitId];
  const impact = buildDashboardImpact(state.payout, {
    payoutHistoryByUnit: state.payoutHistoryByUnit,
    unitIds,
  });

  const revenueTrend = buildRevenueTrend(state.payoutHistoryByUnit, unitIds);
  const composition = buildCompositionSlices(impact.monthDailyGross, impact.monthConnectGross);
  const checkInsWeek = buildCheckInsLastDays(state.checkInLog, unitIds);
  const unitCompare = buildUnitRevenueCompare(state.units, state.payoutsByUnit);
  const showUnitCompare = state.units.length > 1;

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {stats.networkName} · {scopeSummary(state)}
        </p>
      </header>

      <div className="dash-impact-hero card">
        <div className="dash-impact-hero-text">
          <span className="dash-impact-kicker">Impacto financeiro · Connect</span>
          <p className="dash-impact-headline">
            Este mês o ACAF Connect gerou <strong>{formatBRL(impact.monthGross)}</strong> em
            movimentação na sua operação.
          </p>
          <p className="dash-impact-sub">
            <span className="dash-impact-badge">{formatChangePercent(impact.monthChangePercent)}</span>
            vs mês anterior · {impact.salesViaAppMonth} diárias no extrato ·{' '}
            {impact.activeConnectMembers} assíduos com plano ativo
          </p>
        </div>
        <Link className="btn btn-primary dash-impact-cta" to="/financeiro/extrato">
          Ver extrato
        </Link>
      </div>

      <section className="dash-charts-section" aria-labelledby="dash-charts-title">
        <h2 id="dash-charts-title" className="section-title dash-section-title">
          Visão gráfica
        </h2>
        <div className="dash-charts-grid">
          <div className="card dash-chart-card">
            <div className="dash-chart-card-head">
              <div>
                <h3 className="dash-chart-card-title">Evolução da receita</h3>
                <p className="dash-chart-card-sub">Últimos meses · diárias e planos empilhados</p>
              </div>
              <ChartLegend />
            </div>
            <RevenueTrendChart data={revenueTrend} />
          </div>
          <div className="card dash-chart-card">
            <div className="dash-chart-card-head">
              <div>
                <h3 className="dash-chart-card-title">Composição do mês</h3>
                <p className="dash-chart-card-sub">{state.payout.monthLabel}</p>
              </div>
            </div>
            <CompositionDonut slices={composition} total={impact.monthGross} />
          </div>
        </div>
        <div className="dash-charts-row">
          <div className="card dash-chart-card">
            <div className="dash-chart-card-head">
              <div>
                <h3 className="dash-chart-card-title">Check-ins · últimos 7 dias</h3>
                <p className="dash-chart-card-sub">Entradas validadas na recepção</p>
              </div>
            </div>
            <CheckInsWeekChart data={checkInsWeek} />
          </div>
          {showUnitCompare ? (
            <div className="card dash-chart-card">
              <div className="dash-chart-card-head">
                <div>
                  <h3 className="dash-chart-card-title">Receita por unidade</h3>
                  <p className="dash-chart-card-sub">Mês atual · {isAllUnits ? 'rede inteira' : 'comparativo da rede'}</p>
                </div>
                <ChartLegend />
              </div>
              <UnitRevenueChart data={unitCompare} />
            </div>
          ) : (
            <div className="card dash-chart-card">
              <div className="dash-chart-card-head">
                <div>
                  <h3 className="dash-chart-card-title">Movimento na unidade</h3>
                  <p className="dash-chart-card-sub">Check-ins acumulados no mês</p>
                </div>
              </div>
              <div className="stat-card" style={{ marginTop: 8, border: 'none', boxShadow: 'none', padding: '24px 8px' }}>
                <div className="value" style={{ fontSize: '2.5rem' }}>
                  {stats.checkInsMonth}
                </div>
                <div className="label">Check-ins no mês · {stats.receptionToday} hoje</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="dash-period-section" aria-labelledby="dash-period-title">
        <h2 id="dash-period-title" className="section-title dash-section-title">
          Por período de gestão
        </h2>
        <div className="dash-period-grid">
          {impact.periods.map((p) => (
            <div key={p.key} className="dash-period-card stat-card">
              <span className="dash-period-label">{p.label}</span>
              <div className="dash-period-value">{formatBRL(p.grossRevenue)}</div>
              <span className={`dash-period-change ${p.changePercent >= 0 ? 'up' : 'down'}`}>
                {formatChangePercent(p.changePercent)} vs período anterior
              </span>
              <p className="dash-period-detail">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dash-ops-title">
        <h2 id="dash-ops-title" className="section-title dash-section-title">
          Operação em tempo real
        </h2>
        <div className="stat-grid dashboard-stat-grid">
          <div className="stat-card">
            <div className="value">{formatBRL(impact.monthGross)}</div>
            <div className="label">Receita do mês</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.receptionToday}</div>
            <div className="label">Check-ins hoje</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.primaryMembers}</div>
            <div className="label">Assíduos Connect</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.dailyBuyers}</div>
            <div className="label">Compradores diária</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {stats.dailyPassPrice != null ? formatBRL(stats.dailyPassPrice) : 'Por unidade'}
            </div>
            <div className="label">Preço da diária</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {stats.enabledTiers != null ? stats.enabledTiers : `${stats.unitCount} un.`}
            </div>
            <div className="label">
              {stats.enabledTiers != null ? 'Planos ativos' : 'Unidades na rede'}
            </div>
          </div>
        </div>
      </section>

      <div className="card">
        <h2 className="section-title">Atalhos</h2>
        <ul className="dash-links">
          <li>
            <Link to="/unidades">Unidades · cadastro da rede</Link>
          </li>
          <li>
            <Link to="/comercial/planos">Comercial · Planos Connect</Link>
          </li>
          <li>
            <Link to="/check-in">Check-in na recepção</Link>
          </li>
          <li>
            <Link to="/financeiro/saques">Financeiro · Saques</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
