import { useMemo, useState } from 'react';
import { unitDisplayName } from '../data/unitScope';
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
import { channelLabel, filterStudents, tierLabel, usePortal } from '../portalContext';
import type { GymStudent, GymUnit } from '../types';
import { formatBRL } from '../types';
import './StudentsPage.css';

const filters: { id: 'all' | GymStudent['channel']; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'daily_pass', label: 'Diária' },
  { id: 'connect_primary', label: 'Connect · principal' },
  { id: 'connect_visitor', label: 'Connect · visitante' },
];

function studentDailyPrice(student: GymStudent, units: GymUnit[]): number {
  const unit = units.find((u) => u.id === student.unitId);
  return clampDailyPassStudentPrice(student.dailyPassPricePaid ?? unit?.dailyPassPrice ?? DAILY_PASS_STUDENT_MIN);
}

function StudentValueCell({ student, units }: { student: GymStudent; units: GymUnit[] }) {
  if (student.channel === 'daily_pass') {
    const n = student.dailyPassesThisMonth;
    if (n <= 0) return <>—</>;
    const price = studentDailyPrice(student, units);
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

  if (!student.connectPlanId) return <>—</>;

  const studentPart = connectPlanPrice(student.connectPlanId);
  const total = studentPlanTotalGross(student.connectPlanId, CORPORATE_BENEFIT_PER_MONTH);

  return (
    <div className="students-plan-cell">
      <span className="students-plan-total">{formatBRL(total)}</span>
      <span className="students-plan-detail">
        {formatBRL(studentPart)} aluno + {formatBRL(CORPORATE_BENEFIT_PER_MONTH)} empresa
      </span>
    </div>
  );
}

function studentRepasse(student: GymStudent, units: GymUnit[]): number | null {
  if (
    (student.channel === 'connect_primary' || student.channel === 'connect_visitor') &&
    student.connectPlanId
  ) {
    return monthlyGymRepasseForStudentPlan(student.connectPlanId, CORPORATE_BENEFIT_PER_MONTH);
  }
  if (student.channel === 'daily_pass' && student.dailyPassesThisMonth > 0) {
    return monthlyGymRepasseForDailyPass(
      student.dailyPassesThisMonth,
      studentDailyPrice(student, units),
    );
  }
  return null;
}

export function StudentsPage() {
  const { state, isAllUnits } = usePortal();
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<'all' | GymStudent['channel']>('all');

  const rows = useMemo(
    () => filterStudents(state.students, query, channel),
    [state.students, query, channel],
  );

  return (
    <div className="page-stack">
      <header>
        <h1 className="page-title">Clientes</h1>
        <p className="page-subtitle">
          Comercial · movimento de alunos via ACAF Connect (diária e planos).
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input
          placeholder="Buscar nome ou e-mail"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={channel === f.id ? 'chip chip-active' : 'chip'}
              onClick={() => setChannel(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {isAllUnits && <th>Unidade</th>}
              <th>Aluno</th>
              <th>Origem</th>
              <th>Plano</th>
              <th>Check-ins (mês)</th>
              <th>Diárias (mês)</th>
              <th>Valor total/mês</th>
              <th>Sua parte/mês</th>
              <th>Última visita</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const repasse = studentRepasse(s, state.units);
              return (
                <tr key={s.id}>
                  {isAllUnits && <td>{unitDisplayName(state.units, s.unitId)}</td>}
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                  </td>
                  <td>{channelLabel(s.channel)}</td>
                  <td>{s.connectPlanId ? tierLabel(s.connectPlanId) : s.channel === 'daily_pass' ? 'Diária' : '—'}</td>
                  <td>{s.checkInsThisMonth}</td>
                  <td>{s.dailyPassesThisMonth || '—'}</td>
                  <td>
                    <StudentValueCell student={s} units={state.units} />
                  </td>
                  <td>{repasse != null ? formatBRL(repasse) : '—'}</td>
                  <td>{new Date(s.lastVisit).toLocaleDateString('pt-BR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="toast-hint">
        Planos Connect (assíduos e visitantes): colaborador + {formatBRL(CORPORATE_BENEFIT_PER_MONTH)}{' '}
        empresa/mês. Diárias: preço entre {formatBRL(DAILY_PASS_STUDENT_MIN)} e{' '}
        {formatBRL(DAILY_PASS_STUDENT_MAX)} por visita, sem parcela da empresa. Taxa ACAF{' '}
        {ACAF_CONNECT_FEE_PERCENT}% sobre o valor da diária ou sobre o total do plano (aluno + empresa); você
        fica com {100 - ACAF_CONNECT_FEE_PERCENT}%.
      </p>
    </div>
  );
}
