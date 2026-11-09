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
        Planos
      </span>
    </div>
  );
}

/** Linha de tendência compacta para o destaque do topo. */
function RevenueSparkline({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length < 2) return null;
  const W = 280;
  const H = 88;
  const PAD = 8;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    PAD + (i * (W - PAD * 2)) / (values.length - 1),
    PAD + (1 - (v - min) / span) * (H - PAD * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <figure className="dash-hero-spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Receita de ${labels[0]} a ${labels[labels.length - 1]}`}>
        <defs>
          <linearGradient id="dash-spark-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#89b4e0" />
            <stop offset="1" stopColor="#8254e4" />
          </linearGradient>
          <linearGradient id="dash-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7579e5" stopOpacity="0.18" />
            <stop offset="1" stopColor="#7579e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dash-spark-fill)" />
        <path d={line} fill="none" stroke="url(#dash-spark-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lx} cy={ly} r="7" fill="#17142b" />
        <circle cx={lx} cy={ly} r="3.5" fill="#cbf74f" />
      </svg>
      <figcaption>
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

export function DashboardPage() {
  const stats = useDashboardStats();
  const { state, isAllUnits } = usePortal();
  const unitIds = isAllUnits ? state.units.map((u) => u.id) : [state.activeUnitId];
  const impact = buildDashboardImpact(state.payout, {
    payoutHistoryByUnit: state.payoutHistoryByUnit,
    unitIds,
    students: state.students,
    payoutsByUnit: state.payoutsByUnit,
  });

  const revenueTrend = buildRevenueTrend(
    state.payoutHistoryByUnit,
    unitIds,
    state.students,
    state.payoutsByUnit,
  );
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

      <section className="dash-hero" aria-label="Resumo do mês">
        <div className="dash-hero-main">
          <p className="dash-hero-label">Movimentado em {state.payout.monthLabel}</p>
          <p className="dash-hero-value">
            {formatBRL(impact.monthGross)}
            <span className="dash-hero-dot" aria-hidden="true" />
          </p>
          <p className="dash-hero-meta">
            {impact.monthChangePercent !== null ? (
              <>
                <span className={`dash-delta ${impact.monthChangePercent >= 0 ? 'up' : 'down'}`}>
                  {formatChangePercent(impact.monthChangePercent)}
                </span>
                em relação ao mês anterior.{' '}
              </>
            ) : null}
            {impact.salesViaAppMonth} {impact.salesViaAppMonth === 1 ? 'diária vendida' : 'diárias vendidas'} e{' '}
            {impact.activeConnectMembers}{' '}
            {impact.activeConnectMembers === 1 ? 'assíduo com plano ativo' : 'assíduos com plano ativo'}.
          </p>
        </div>
        <div className="dash-hero-side">
          <RevenueSparkline
            values={revenueTrend.map((p) => p.total)}
            labels={revenueTrend.map((p) => p.label)}
          />
          <Link className="btn btn-secondary dash-hero-cta" to="/financeiro/extrato">
            Ver extrato
          </Link>
        </div>
      </section>

      <section className="dash-charts-section" aria-labelledby="dash-charts-title">
        <h2 id="dash-charts-title" className="section-title dash-section-title">
          Receita e movimento
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
              {p.changePercent !== null ? (
                <span className={`dash-period-change ${p.changePercent >= 0 ? 'up' : 'down'}`}>
                  {formatChangePercent(p.changePercent)} vs mês anterior
                </span>
              ) : null}
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
            <div className="label">Assíduos com plano</div>
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
            <Link to="/comercial/planos">Operação · Planos</Link>
          </li>
          <li>
            <Link to="/check-in">Check-in em tempo real</Link>
          </li>
          <li>
            <Link to="/financeiro/saques">Financeiro · Saques</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
