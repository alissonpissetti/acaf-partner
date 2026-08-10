import { AcafFeeExplainer } from '../components/AcafFeeExplainer';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import {
  acafFeeFromGross,
  ACAF_CONNECT_FEE_PERCENT,
  connectPlanPrice,
} from '../data/acafFees';
import { usePortal } from '../portalContext';
import { connectPlanName, formatBRL } from '../types';

export function PayoutsPage() {
  const { state, isAllUnits } = usePortal();
  const { payout, payoutsByUnit, units } = state;

  const statusClass =
    payout.status === 'paid'
      ? 'badge badge-paid'
      : payout.status === 'processing'
        ? 'badge badge-processing'
        : 'badge badge-open';

  const statusLabel =
    payout.status === 'paid' ? 'Pago' : payout.status === 'processing' ? 'Em processamento' : 'Em aberto';

  const dailyAcafFee = acafFeeFromGross(payout.dailyPassGross);

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Repasses mensais</h1>
        <p className="page-subtitle">
          Valores que a unidade recebe após {ACAF_CONNECT_FEE_PERCENT}% ACAF Connect (o que o aluno paga
          em diárias e planos).
        </p>
      </header>

      <AcafFeeExplainer />

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
            <div className="value">{formatBRL(dailyAcafFee)}</div>
            <div className="label">Diárias · taxa ACAF {ACAF_CONNECT_FEE_PERCENT}%</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(payout.dailyPassNet)}</div>
            <div className="label">Diárias · repasse academia</div>
          </div>
          <div className="stat-card">
            <div className="value">{formatBRL(payout.connectRepasseTotal)}</div>
            <div className="label">Planos alunos · repasse (80%)</div>
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
          Repasse = {100 - ACAF_CONNECT_FEE_PERCENT}% do valor mensal X pago pelo aluno em cada tier.
        </p>
        <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Assíduos</th>
                <th>Check-ins (mês)</th>
                <th>Plano (R$/aluno)</th>
                <th>Taxa ACAF</th>
                <th>Repasse academia</th>
              </tr>
            </thead>
            <tbody>
              {payout.connectLines.map((line) => {
                const planPrice = connectPlanPrice(line.connectPlanId);
                const grossTotal = planPrice * line.activeMembers;
                const feeTotal = acafFeeFromGross(grossTotal);
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
                <th>Taxa {ACAF_CONNECT_FEE_PERCENT}%</th>
                <th>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {payout.recentDailySales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                  <td>{sale.studentName}</td>
                  <td>{formatBRL(sale.gross)}</td>
                  <td>{formatBRL(acafFeeFromGross(sale.gross))}</td>
                  <td>{formatBRL(sale.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
