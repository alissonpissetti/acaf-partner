import { ConnectFeeExplainer } from '../components/ConnectFeeExplainer';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { connectPlanPrice, CORPORATE_BENEFIT_PER_MONTH } from '../data/connectFees';
import {
  portalFeePolicyFromView,
  resolveConnectFeePercentForUnit,
  resolveDailyFeePercentForUnit,
} from '../data/platformFeePolicy';
import { usePortal } from '../portalContext';
import { connectPlanName, formatBRL } from '../types';

export function PayoutsPage() {
  const { state, unit, isAllUnits } = usePortal();
  const { payout, payoutsByUnit, units } = state;

  const policy = portalFeePolicyFromView(state);
  const dailyPct = resolveDailyFeePercentForUnit(unit, policy);
  const connectPct = resolveConnectFeePercentForUnit(unit, policy);
  const feeBlurb = isAllUnits
    ? 'Taxas por unidade (diárias e planos podem variar conforme Configurações e overrides).'
    : `Diárias ${dailyPct}% · Planos ${connectPct}%`;

  const statusClass =
    payout.status === 'paid'
      ? 'badge badge-paid'
      : payout.status === 'processing'
        ? 'badge badge-processing'
        : 'badge badge-open';

  const statusLabel =
    payout.status === 'paid' ? 'Pago' : payout.status === 'processing' ? 'Em processamento' : 'Em aberto';

  const dailyPlatformFee = Math.round((payout.dailyPassGross - payout.dailyPassNet) * 100) / 100;
  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Repasses mensais</h1>
        <p className="page-subtitle">
          {feeBlurb} Valores abaixo são líquidos para a academia (o que o aluno paga em diárias e
          planos, menos a taxa da plataforma).
        </p>
      </header>

      <ConnectFeeExplainer />

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 className="section-title">{payout.monthLabel}</h2>
            <span className={statusClass}>{statusLabel}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatBRL(payout.totalNet)}</div>
            <div className="page-subtitle">Total líquido à academia</div>
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 24 }}>
          <div className="stat-card">
            <div className="value">{formatBRL(payout.dailyPassGross)}</div>
            <div className="label">Diárias · bruto (aluno)</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(dailyPlatformFee)}</div>
            <div className="label">Diárias · taxa ({formatBRL(dailyPlatformFee)})</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(payout.dailyPassNet)}</div>
            <div className="label">Diárias · repasse academia</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(payout.connectRepasseTotal)}</div>
            <div className="label">Planos alunos · repasse líquido</div>
          </div>
        </div>
      </div>

      {isAllUnits && (
        <div className="card">
          <h2 className="section-title">Por unidade</h2>
          <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Diárias líquidas</th>
                  <th>Planos alunos</th>
                  <th>Total líquido</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const p = payoutsByUnit[u.id];
                  if (!p) return null;
                  return (
                    <tr key={u.id}>
                      <td>{u.unitName}</td>
                      <td>{formatBRL(p.dailyPassNet)}</td>
                      <td>{formatBRL(p.connectRepasseTotal)}</td>
                      <td>{formatBRL(p.totalNet)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="section-title">Planos · assíduos (academia principal)</h2>
        <p className="page-subtitle" style={{ marginTop: 8 }}>
          Repasse após taxa de planos ({isAllUnits ? 'varia por unidade' : `${connectPct}%`}) sobre o
          total mensal pago pelo aluno em cada tier.
        </p>
        <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Assíduos</th>
                <th>Check-ins (mês)</th>
                <th>Plano (R$/aluno)</th>
                <th>Taxa da plataforma</th>
                <th>Repasse academia</th>
              </tr>
            </thead>
            <tbody>
              {payout.connectLines.map((line) => {
                const planPrice = connectPlanPrice(line.connectPlanId);
                const grossTotal = planPrice * line.activeMembers;
                const corpTotal = CORPORATE_BENEFIT_PER_MONTH * line.activeMembers;
                const lineGross = grossTotal + corpTotal;
                const feeTotal = lineGross - line.repasseAmount;
                return (
                  <tr key={line.connectPlanId}>
                    <td>{connectPlanName(line.connectPlanId)}</td>
                    <td>{line.activeMembers}</td>
                    <td>{line.checkIns}</td>
                    <td>{formatBRL(planPrice)}</td>
                    <td>{formatBRL(feeTotal)}</td>
                    <td>{formatBRL(line.repasseAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Últimas diárias</h2>
        <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Comprador</th>
                <th>Bruto</th>
                <th>Taxa (líq.)</th>
                <th>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {payout.recentDailySales.map((sale) => {
                const saleUnit = sale.unitId ? units.find((u) => u.id === sale.unitId) : unit;
                const pct = resolveDailyFeePercentForUnit(saleUnit, policy);
                const fee = sale.gross - sale.net;
                return (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                    <td>{sale.studentName}</td>
                    <td>{formatBRL(sale.gross)}</td>
                    <td>
                      {formatBRL(fee)}
                      <span className="page-subtitle" style={{ marginLeft: 6 }}>
                        ({pct}%)
                      </span>
                    </td>
                    <td>{formatBRL(sale.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
