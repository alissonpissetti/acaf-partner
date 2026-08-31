import { CONNECT_FEE_PERCENT, formatFeeLabel, formatGymShareLabel } from '../data/connectFees';

export function ConnectFeeExplainer({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="toast-hint" style={{ margin: 0 }}>
        {formatFeeLabel()} sobre o <strong>total</strong> de cada plano (parte do aluno + benefício
        corporativo da empresa) e sobre o <strong>valor da diária</strong>. Você recebe{' '}
        {100 - CONNECT_FEE_PERCENT}% ({formatGymShareLabel()}).
      </p>
    );
  }

  return (
    <div className="card-muted form-grid" style={{ lineHeight: 1.55, fontSize: '0.875rem' }}>
      <strong>Como a plataforma cobra (visão do parceiro)</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
        <li>
          <strong>Diárias:</strong> {CONNECT_FEE_PERCENT}% sobre o valor da diária ·{' '}
          {100 - CONNECT_FEE_PERCENT}% fica com você.
        </li>
        <li>
          <strong>Planos dos alunos:</strong> {CONNECT_FEE_PERCENT}% sobre o total mensal (plano do
          colaborador + benefício corporativo) · {100 - CONNECT_FEE_PERCENT}% fica com você.
        </li>
        <li>
          <strong>Check-ins:</strong> entram no valor do plano do aluno (mesma taxa de{' '}
          {CONNECT_FEE_PERCENT}% sobre o total atribuído à unidade).
        </li>
      </ul>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        No extrato, os valores aparecem sem a taxa; ela é descontada na hora do saque, sempre{' '}
        {CONNECT_FEE_PERCENT}%.
      </p>
    </div>
  );
}
