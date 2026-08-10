import {
  buildMonthGrid,
  calendarWeekdayLabels,
  formatCalendarDayLabel,
  formatMonthLabel,
  shiftMonth,
  type CalendarCell,
} from '../data/modalityCalendar';
import './ModalityReservationCalendar.css';

type Props = {
  monthKey: string;
  selectedDate: string;
  countsByDate: Map<string, number>;
  loading?: boolean;
  onMonthChange: (monthKey: string) => void;
  onSelectDate: (date: string) => void;
};

export function ModalityReservationCalendar({
  monthKey,
  selectedDate,
  countsByDate,
  loading = false,
  onMonthChange,
  onSelectDate,
}: Props) {
  const cells = buildMonthGrid(monthKey);
  const weekdays = calendarWeekdayLabels();

  return (
    <div className={`modality-calendar ${loading ? 'is-loading' : ''}`}>
      <div className="modality-calendar-toolbar">
        <button
          type="button"
          className="btn btn-secondary btn-sm modality-calendar-nav"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <strong className="modality-calendar-month">{formatMonthLabel(monthKey)}</strong>
        <button
          type="button"
          className="btn btn-secondary btn-sm modality-calendar-nav"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="modality-calendar-grid" role="grid" aria-label={`Calendário de ${formatMonthLabel(monthKey)}`}>
        {weekdays.map((label) => (
          <div key={label} className="modality-calendar-weekday" role="columnheader">
            {label}
          </div>
        ))}
        {cells.map((cell) => (
          <CalendarDayCell
            key={cell.date}
            cell={cell}
            count={countsByDate.get(cell.date) ?? 0}
            selected={cell.date === selectedDate}
            onSelect={() => onSelectDate(cell.date)}
          />
        ))}
      </div>

      <p className="modality-calendar-selected-label">
        Dia selecionado: <strong>{formatCalendarDayLabel(selectedDate)}</strong>
      </p>
    </div>
  );
}

function CalendarDayCell({
  cell,
  count,
  selected,
  onSelect,
}: {
  cell: CalendarCell;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const dayNumber = Number(cell.date.slice(8, 10));
  const intensity =
    count === 0 ? 'none' : count <= 2 ? 'low' : count <= 5 ? 'medium' : 'high';

  return (
    <button
      type="button"
      role="gridcell"
      className={[
        'modality-calendar-day',
        !cell.inMonth ? 'is-outside' : '',
        cell.isToday ? 'is-today' : '',
        selected ? 'is-selected' : '',
        count > 0 ? 'has-reservations' : '',
        `load-${intensity}`,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${dayNumber}${count > 0 ? `, ${count} reserva${count === 1 ? '' : 's'}` : ', sem reservas'}`}
    >
      <span className="modality-calendar-day-num">{dayNumber}</span>
      {count > 0 ? <span className="modality-calendar-day-count">{count}</span> : null}
    </button>
  );
}
