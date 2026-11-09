import { useMemo } from 'react';
import { connectFeePercent, domainDailyFeePercent } from '../data/connectFees';
import {
  portalFeePolicyFromView,
  resolveConnectFeePercentForUnit,
  resolveDailyFeePercentForUnit,
} from '../data/platformFeePolicy';
import { usePortal } from '../portalContext';

export function ConnectFeeExplainer({ compact }: { compact?: boolean }) {
  const { state, unit } = usePortal();
  const policy = useMemo(() => portalFeePolicyFromView(state), [state]);

  const dailyPct = useMemo(
    () => resolveDailyFeePercentForUnit(unit, policy),
    [unit, policy],
  );
  const connectPct = useMemo(
    () => resolveConnectFeePercentForUnit(unit, policy),
    [unit, policy],
  );

  const feeSummary = `diárias ${dailyPct}% · planos ${connectPct}%`;
  const dailyShare = 100 - dailyPct;
  const connectShare = 100 - connectPct;

  if (compact) {
    return (
      <p className="toast-hint" style={{ margin: 0 }}>
        Taxa da plataforma: <strong>{feeSummary}</strong> — sobre o <strong>total</strong> de cada plano
        (parte do aluno + benefício corporativo) e sobre o <strong>valor da diária</strong>. No repasse,
        você fica com {dailyShare}% das diárias e {connectShare}% dos planos (após a taxa de cada tipo).
      </p>
    );
  }

  return (
    <div className="card-muted form-grid" style={{ lineHeight: 1.55, fontSize: '0.875rem' }}>
      <strong>Como a plataforma cobra (visão do parceiro)</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
        <li>
          <strong>Diárias:</strong> {dailyPct}% sobre o valor da diária · {dailyShare}% fica com você.
        </li>
        <li>
          <strong>Planos dos alunos:</strong> {connectPct}% sobre o total mensal (plano do colaborador +
          benefício corporativo) · {connectShare}% fica com você.
        </li>
        <li>
          <strong>Check-ins:</strong> entram no valor do plano do aluno (taxa de planos: {connectPct}% sobre
          o total atribuído à unidade).
        </li>
      </ul>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        Padrão global no admin (quando não houver override por rede/unidade): diárias{' '}
        {domainDailyFeePercent()}% · planos {connectFeePercent()}%. No extrato, os valores aparecem sem a
        taxa; ela é descontada na hora do saque.
      </p>
    </div>
  );
}
