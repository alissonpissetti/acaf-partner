import { useEffect, useMemo, useState } from 'react';
import { fetchPartnerClients } from '../api/client';
import { PartnerClientDetailModal } from '../components/PartnerClientDetailModal';
import {
  monthlyGymRepasseForStudentPlan,
  monthlyGymRepasseForDailyPass,
  monthlyDailyPassGrossForStudent,
  connectPlanPrice,
  studentPlanTotalGross,
  clampDailyPassStudentPrice,
  dailyPassTotalPerSale,
  ACAF_CONNECT_FEE_PERCENT,
  CORPORATE_BENEFIT_PER_MONTH,
  DAILY_PASS_STUDENT_MIN,
  DAILY_PASS_STUDENT_MAX,
} from '../data/acafFees';
import { exportPartnerClientsToExcel } from '../data/exportPartnerClients';
import { tierLabel } from '../data/helpers';
import {
  clientCompanyLabel,
  relationshipLabel,
  type PartnerClientSummary,
} from '../data/partnerClients';
import { unitDisplayName } from '../data/unitScope';
import { usePortal } from '../portalContext';
import type { GymUnit } from '../types';
import { formatBRL } from '../types';
import './StudentsPage.css';

type PlanFilter = 'all' | 'connect_primary' | 'daily_pass';

type SortKey = 'name' | 'lastVisit' | 'checkIns';

function clientCorporateBenefit(client: PartnerClientSummary): number {
  return client.corporateBenefitPerMonth ?? CORPORATE_BENEFIT_PER_MONTH;
}

function clientDailyPrice(client: PartnerClientSummary, units: GymUnit[]): number {
  const unit = units.find((u) => u.id === client.primaryUnitId) ?? units[0];
  return clampDailyPassStudentPrice(
    client.dailyPassPricePaid ?? unit?.dailyPassPrice ?? DAILY_PASS_STUDENT_MIN,
  );
}

function ClientValueCell({ client, units }: { client: PartnerClientSummary; units: GymUnit[] }) {
  if (client.isPrimaryMember && client.connectPlanId) {
    const corporate = clientCorporateBenefit(client);
    const studentPart = connectPlanPrice(client.connectPlanId);
    const total = studentPlanTotalGross(client.connectPlanId, corporate);
    return (
      <div className="students-plan-cell">
        <span className="students-plan-total">{formatBRL(total)}</span>
        <span className="students-plan-detail">
          {formatBRL(studentPart)} colaborador + {formatBRL(corporate)} empresa
        </span>
      </div>
    );
  }

  const n = client.dailyPassesThisMonth;
  if (n <= 0) return <>—</>;
  const price = clientDailyPrice(client, units);
  const perSale = dailyPassTotalPerSale(price);
  const total = monthlyDailyPassGrossForStudent(n, price);
  return (
    <div className="students-plan-cell">
      <span className="students-plan-total">{formatBRL(total)}</span>
      <span className="students-plan-detail">
        {n}× {formatBRL(perSale)}
      </span>
    </div>
  );
}

function clientRepasse(client: PartnerClientSummary, units: GymUnit[]): number | null {
  if (client.isPrimaryMember && client.connectPlanId) {
    return monthlyGymRepasseForStudentPlan(client.connectPlanId, clientCorporateBenefit(client));
  }
  if (client.dailyPassesThisMonth > 0) {
    return monthlyGymRepasseForDailyPass(
      client.dailyPassesThisMonth,
      clientDailyPrice(client, units),
    );
  }
  return null;
}

function matchesPlanFilter(client: PartnerClientSummary, filter: PlanFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'connect_primary') return client.isPrimaryMember;
  return client.dailyPassesTotal > 0 || client.relationship === 'daily_pass';
}

function sortClients(clients: PartnerClientSummary[], sortKey: SortKey): PartnerClientSummary[] {
  const copy = [...clients];
  switch (sortKey) {
    case 'lastVisit':
      return copy.sort((a, b) => {
        const av = a.lastVisit ?? '';
        const bv = b.lastVisit ?? '';
        return bv.localeCompare(av);
      });
    case 'checkIns':
      return copy.sort((a, b) => b.totalCheckIns - a.totalCheckIns);
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }
}

export function StudentsPage() {
  const { state, isAllUnits } = usePortal();
  const [clients, setClients] = useState<PartnerClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedClient, setSelectedClient] = useState<PartnerClientSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchPartnerClients(state.unitScope)
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar clientes.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.unitScope]);

  const companies = useMemo(() => {
    const names = new Set<string>();
    for (const client of clients) {
      const name = client.companyName?.trim();
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clients]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = clients.filter((client) => {
      if (!matchesPlanFilter(client, planFilter)) return false;
      if (companyFilter !== 'all' && client.companyName !== companyFilter) return false;
      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        (client.email?.toLowerCase().includes(q) ?? false) ||
        (client.cpf?.includes(q) ?? false)
      );
    });
    return sortClients(filtered, sortKey);
  }, [clients, query, planFilter, companyFilter, sortKey]);

  return (
    <div className="page-stack">
      <header className="students-page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            Quem fez check-in nas suas unidades ou elegeu sua academia como principal no Connect.
          </p>
        </div>
        <button
          type="button"
          className="students-export-btn"
          disabled={loading || rows.length === 0}
          onClick={() => exportPartnerClientsToExcel(rows, state.units, isAllUnits)}
        >
          Exportar Excel
        </button>
      </header>

      {loadError ? <p className="students-load-error">{loadError}</p> : null}

      <div className="students-toolbar">
        <input
          className="students-search"
          placeholder="Buscar nome, e-mail ou CPF"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
        />
        <div className="students-filters">
          <button
            type="button"
            className={planFilter === 'all' ? 'chip chip-active' : 'chip'}
            onClick={() => setPlanFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={planFilter === 'connect_primary' ? 'chip chip-active' : 'chip'}
            onClick={() => setPlanFilter('connect_primary')}
          >
            Plano mensal
          </button>
          <button
            type="button"
            className={planFilter === 'daily_pass' ? 'chip chip-active' : 'chip'}
            onClick={() => setPlanFilter('daily_pass')}
          >
            Diária
          </button>
        </div>
        <label className="students-sort">
          <span>Ordenar</span>
          <select value={sortKey} onChange={(ev) => setSortKey(ev.target.value as SortKey)}>
            <option value="name">Nome (A–Z)</option>
            <option value="lastVisit">Última visita</option>
            <option value="checkIns">Mais check-ins</option>
          </select>
        </label>
      </div>

      {companies.length > 1 && (
        <div className="students-company-filters">
          <span className="students-company-label">Empresa:</span>
          <button
            type="button"
            className={companyFilter === 'all' ? 'chip chip-active' : 'chip'}
            onClick={() => setCompanyFilter('all')}
          >
            Todas
          </button>
          {companies.map((name) => (
            <button
              key={name}
              type="button"
              className={companyFilter === name ? 'chip chip-active' : 'chip'}
              onClick={() => setCompanyFilter(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <p className="students-count">
        {loading ? 'Carregando…' : `${rows.length} cliente${rows.length === 1 ? '' : 's'}`}
      </p>

      <div className="table-wrap">
        <table className="data-table students-table">
          <thead>
            <tr>
              {isAllUnits && <th>Unidade</th>}
              <th>Cliente</th>
              <th>Vínculo</th>
              <th>Check-ins (mês)</th>
              <th>Diárias (mês)</th>
              <th>Valor total/mês</th>
              <th>Sua parte/mês</th>
              <th>Última visita</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAllUnits ? 8 : 7} className="students-empty">
                  Carregando clientes…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isAllUnits ? 8 : 7} className="students-empty">
                  Nenhum cliente encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              rows.map((client) => {
                const repasse = clientRepasse(client, state.units);
                return (
                  <tr
                    key={client.holderKey}
                    className="students-row-clickable"
                    onClick={() => setSelectedClient(client)}
                  >
                    {isAllUnits && (
                      <td>
                        {client.primaryUnitId
                          ? unitDisplayName(state.units, client.primaryUnitId)
                          : '—'}
                      </td>
                    )}
                    <td>
                      <div className="students-name">{client.name}</div>
                      <div className="students-email">{client.email ?? '—'}</div>
                      <small className="students-company">
                        <em>{clientCompanyLabel(client)}</em>
                      </small>
                    </td>
                    <td>
                      <div>{relationshipLabel(client.relationship)}</div>
                      {client.connectPlanId ? (
                        <small className="students-plan-id">{tierLabel(client.connectPlanId)}</small>
                      ) : null}
                    </td>
                    <td>{client.checkInsThisMonth}</td>
                    <td>{client.dailyPassesThisMonth || '—'}</td>
                    <td>
                      <ClientValueCell client={client} units={state.units} />
                    </td>
                    <td>{repasse != null ? formatBRL(repasse) : '—'}</td>
                    <td>
                      {client.lastVisit
                        ? new Date(client.lastVisit).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="toast-hint">
        Plano mensal: parcela do colaborador + benefício da empresa (ex.:{' '}
        {formatBRL(CORPORATE_BENEFIT_PER_MONTH)}/mês). Diárias: {formatBRL(DAILY_PASS_STUDENT_MIN)}–
        {formatBRL(DAILY_PASS_STUDENT_MAX)} por visita, pagas pelo colaborador. Taxa ACAF{' '}
        {ACAF_CONNECT_FEE_PERCENT}% sobre o valor; você fica com {100 - ACAF_CONNECT_FEE_PERCENT}%.
        Clique em um cliente para ver o histórico completo.
      </p>

      <PartnerClientDetailModal
        open={selectedClient != null}
        client={selectedClient}
        unitScope={state.unitScope}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
