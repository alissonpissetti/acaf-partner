import type { DaySlotRow } from '../data/modalityOccurrences';
import {
  daySlotOccupancyLabel,
  daySlotReservationsSummary,
  slotTimePhase,
} from '../data/modalityOccurrences';
import { OccupancyDonut } from './OccupancyDonut';

type Props = {
  date: string;
  rows: DaySlotRow[];
  loading?: boolean;
};

export function DayScheduleOverview({ date, rows, loading = false }: Props) {
  const stats = {
    slots: rows.length,
    booked: rows.reduce((sum, row) => sum + row.booked, 0),
    available: rows.reduce((sum, row) => sum + row.available, 0),
  };

  if (loading) {
    return <p className="modality-schedule-empty">Carregando programação do dia…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="modality-schedule-empty">Nenhuma aula ou faixa programada para este dia.</p>
    );
  }

  return (
    <div className="modality-day-overview">
      <div className="modality-day-overview-stats" aria-label="Resumo do dia">
        <span>
          <strong>{stats.slots}</strong> horário{stats.slots === 1 ? '' : 's'}
        </span>
        <span className="modality-day-overview-stat-sep" aria-hidden>
          ·
        </span>
        <span>
          <strong>{stats.booked}</strong> reserva{stats.booked === 1 ? '' : 's'}
        </span>
        <span className="modality-day-overview-stat-sep" aria-hidden>
          ·
        </span>
        <span>
          <strong>{stats.available}</strong>{' '}
          {stats.available === 1 ? 'vaga livre' : 'vagas livres'}
        </span>
      </div>

      <div className="modality-day-overview-table-wrap">
        <table className="modality-schedule-table modality-day-overview-table">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Modalidade</th>
              <th>Professor</th>
              <th>Ocupação</th>
              <th>Reservas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((slot) => {
              const phase = slotTimePhase(date, slot.startTime, slot.endTime);
              return (
                <tr
                  key={slot.occurrenceKey}
                  className={[
                    phase === 'now' ? 'modality-day-overview-row-now' : '',
                    phase === 'past' ? 'modality-day-overview-row-past' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                >
                  <td className="modality-schedule-slot-time">
                    {slot.startTime}–{slot.endTime}
                    {phase === 'now' ? (
                      <span className="modality-day-overview-now-badge">Agora</span>
                    ) : null}
                  </td>
                  <td>{slot.modality}</td>
                  <td>{slot.instructorName ? `Prof. ${slot.instructorName}` : '—'}</td>
                  <td className="modality-day-occupancy-cell">
                    <OccupancyDonut booked={slot.booked} capacity={slot.capacity} />
                    <span className="modality-schedule-slot-capacity">
                      {daySlotOccupancyLabel(slot)}
                    </span>
                  </td>
                  <td>{daySlotReservationsSummary(slot, date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
