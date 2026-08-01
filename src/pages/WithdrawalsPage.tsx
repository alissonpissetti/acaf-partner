import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AcafFeeExplainer } from '../components/AcafFeeExplainer';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import {
  acafFeeFromGross,
  ACAF_CONNECT_FEE_PERCENT,
  gymNetFromGross,
} from '../data/acafFees';
import { payoutGrossSummary } from '../data/payoutGross';
import { scopeSummary } from '../data/unitScope';
import { usePortal } from '../portalContext';
import { formatBRL } from '../types';

type WithdrawalRow = {
  id: string;
  date: string;
  grossAmount: number;
  acafFee: number;
  netAmount: number;
  status: 'paid' | 'processing';
  unitLabel: string;
};

type StoredWithdrawal = WithdrawalRow | { id: string; date: string; amount: number; status: 'paid' | 'processing'; unitLabel: string };

const WITHDRAWALS_KEY = 'acaf_gym_withdrawals_mock';

function normalizeWithdrawal(raw: StoredWithdrawal): WithdrawalRow {
  if ('grossAmount' in raw) return raw;
  const grossAmount = raw.amount;
  return {
    id: raw.id,
    date: raw.date,
    grossAmount,
    acafFee: acafFeeFromGross(grossAmount),
    netAmount: gymNetFromGross(grossAmount),
    status: raw.status,
    unitLabel: raw.unitLabel,
  };
}

function loadWithdrawals(): WithdrawalRow[] {
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    if (raw) return (JSON.parse(raw) as StoredWithdrawal[]).map(normalizeWithdrawal);
  } catch {
    /* ignore */
  }
  return [
    normalizeWithdrawal({
      id: 'w1',
      date: '2026-07-15',
      amount: 1200,
      status: 'paid',
      unitLabel: 'Rede · Portão',
    }),
  ];
}

function saveWithdrawals(rows: WithdrawalRow[]) {
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(rows));
}

export function WithdrawalsPage() {
  const { state, unit, isAllUnits } = usePortal();
  const [withdrawals, setWithdrawals] = useState(loadWithdrawals);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const grossSummary = useMemo(() => payoutGrossSummary(state.payout), [state.payout]);

  const withdrawnGross = useMemo(
    () => withdrawals.reduce((a, w) => a + w.grossAmount, 0),
    [withdrawals],
  );

  const availableGross = Math.max(0, grossSummary.totalGross - withdrawnGross);

  const previewGross = parseFloat(amount.replace(',', '.')) || 0;
  const previewFee = previewGross > 0 ? acafFeeFromGross(previewGross) : 0;
  const previewNet = previewGross > 0 ? gymNetFromGross(previewGross) : 0;

  const requestWithdrawal = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      setMessage('Informe um valor válido.');
      return;
    }
    if (value > availableGross) {
      setMessage('Valor acima do saldo disponível para saque.');
      return;
    }
    const acafFee = acafFeeFromGross(value);
    const netAmount = gymNetFromGross(value);
    const row: WithdrawalRow = {
      id: `w-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      grossAmount: value,
      acafFee,
      netAmount,
      status: 'processing',
      unitLabel: isAllUnits ? scopeSummary(state) : unit.unitName,
    };
    const next = [row, ...withdrawals];
    setWithdrawals(next);
    saveWithdrawals(next);
    setAmount('');
    setMessage(
      `Saque registrado: ${formatBRL(value)} solicitados · taxa ACAF ${ACAF_CONNECT_FEE_PERCENT}% (${formatBRL(acafFee)}) · você recebe ${formatBRL(netAmount)}.`,
    );
  };

  return (
    <div className="page-stack">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Saques</h1>
        <p className="page-subtitle">
          Solicite transferência com base no extrato. A taxa ACAF Connect ({ACAF_CONNECT_FEE_PERCENT}%)
          é calculada ao confirmar cada saque. Detalhes em{' '}
          <Link to="/financeiro/extrato">Extrato financeiro</Link>.
        </p>
      </header>

      <AcafFeeExplainer />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="value">{formatBRL(grossSummary.totalGross)}</div>
          <div className="label">Total do mês (extrato)</div>
        </div>
        <div className="stat-card">
          <div className="value">{formatBRL(availableGross)}</div>
          <div className="label">Disponível para saque</div>
        </div>
        <div className="stat-card">
          <div className="value">{formatBRL(withdrawnGross)}</div>
          <div className="label">Já solicitado</div>
        </div>
      </div>

      <div className="card form-grid">
        <h2 className="section-title">Nova solicitação</h2>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label>Valor do saque (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={requestWithdrawal}>
              Solicitar saque
            </button>
          </div>
        </div>
        {previewGross > 0 && (
          <div className="card-muted" style={{ padding: 12, fontSize: '0.875rem', lineHeight: 1.5 }}>
            <strong>Simulação deste saque</strong>
            <div>Valor solicitado: {formatBRL(previewGross)}</div>
            <div>
              Taxa ACAF {ACAF_CONNECT_FEE_PERCENT}%: {formatBRL(previewFee)}
            </div>
            <div>Valor que você recebe: {formatBRL(previewNet)}</div>
          </div>
        )}
        {message && (
          <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--foreground-secondary)' }}>{message}</p>
        )}
        <p className="page-subtitle" style={{ margin: 0 }}>
          Prazo habitual: até 2 dias úteis após aprovação pela ACAF Connect.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Histórico de saques</h2>
        <div className="table-wrap" style={{ marginTop: 16, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Referência</th>
                <th>Solicitado</th>
                <th>Taxa ACAF</th>
                <th>Recebido</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.date).toLocaleDateString('pt-BR')}</td>
                  <td>{w.unitLabel}</td>
                  <td>{formatBRL(w.grossAmount)}</td>
                  <td>{formatBRL(w.acafFee)}</td>
                  <td>{formatBRL(w.netAmount)}</td>
                  <td>
                    <span className={w.status === 'paid' ? 'badge badge-paid' : 'badge badge-processing'}>
                      {w.status === 'paid' ? 'Pago' : 'Em processamento'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
