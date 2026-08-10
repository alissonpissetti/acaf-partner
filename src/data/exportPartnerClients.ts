import { relationshipLabel, type PartnerClientSummary } from './partnerClients';
import { tierLabel } from './helpers';
import type { GymUnit } from '../types';
import { unitDisplayName } from './unitScope';

function csvCell(value: string | number | undefined | null): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

export function exportPartnerClientsToExcel(
  clients: PartnerClientSummary[],
  units: GymUnit[],
  isAllUnits: boolean,
): void {
  const headers = [
    'Nome',
    'E-mail',
    'CPF',
    'Empresa',
    'Vínculo',
    'Plano Connect',
    'Academia principal',
    'Principal desde',
    'Connect desde',
    ...(isAllUnits ? ['Unidade principal'] : []),
    'Check-ins (total)',
    'Check-ins (mês)',
    'Diárias (total)',
    'Diárias (mês)',
    'Última visita',
  ];

  const rows = clients.map((client) => {
    const plan = client.connectPlanId ? tierLabel(client.connectPlanId) : '';
    const unitLabel = client.primaryUnitId
      ? unitDisplayName(units, client.primaryUnitId)
      : '';
    return [
      client.name,
      client.email ?? '',
      client.cpf ?? '',
      client.companyName ?? '',
      relationshipLabel(client.relationship),
      plan,
      client.primaryUnitName ?? unitLabel,
      formatDate(client.primaryChosenAt),
      formatDate(client.connectSince),
      ...(isAllUnits ? [unitLabel] : []),
      client.totalCheckIns,
      client.checkInsThisMonth,
      client.dailyPassesTotal,
      client.dailyPassesThisMonth,
      formatDate(client.lastVisit),
    ];
  });

  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF', lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `clientes-acaf-${stamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
