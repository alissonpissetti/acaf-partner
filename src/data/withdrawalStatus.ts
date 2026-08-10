export type WithdrawalStatusUi = {
  label: string;
  description: string;
  variant: 'pending' | 'active' | 'success' | 'danger';
  stepIndex: number;
  stepTotal: number;
};

export const WITHDRAWAL_FLOW_STEP_LABELS = [
  'Registrado',
  'Análise',
  'Repasse',
  'Pago',
] as const;

const META: Record<
  string,
  Pick<WithdrawalStatusUi, 'label' | 'description' | 'variant' | 'stepIndex'>
> = {
  registered: {
    label: 'Solicitação registrada',
    description:
      'Recebemos seu pedido. A equipe financeira seguirá com a análise e o repasse.',
    variant: 'pending',
    stepIndex: 0,
  },
  processing: {
    label: 'Repasse em andamento',
    description: 'O pagamento está sendo processado junto à instituição financeira.',
    variant: 'active',
    stepIndex: 2,
  },
  paid: {
    label: 'Valor enviado',
    description: 'O repasse foi concluído para o destino informado.',
    variant: 'success',
    stepIndex: 3,
  },
  cancelled: {
    label: 'Solicitação cancelada',
    description: 'Este saque foi cancelado.',
    variant: 'danger',
    stepIndex: -1,
  },
};

export function withdrawalStatusUi(
  rawStatus: string | null | undefined,
): WithdrawalStatusUi {
  const key = String(rawStatus || 'registered').trim().toLowerCase();
  const stepTotal = WITHDRAWAL_FLOW_STEP_LABELS.length;
  const legacyPaid = key === 'paid' || key === 'completed';
  const found = legacyPaid ? META.paid : META[key];
  if (found) {
    return { ...found, stepTotal };
  }
  return {
    label: 'Em andamento',
    description: 'Acompanhe o status desta solicitação.',
    variant: 'pending',
    stepIndex: 0,
    stepTotal,
  };
}

export function withdrawalStepIndices(total: number): number[] {
  const n = Math.max(0, Math.floor(total));
  return [...Array(n).keys()];
}
