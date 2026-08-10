import {
  formatCalendarDayLabel,
  isTodayDate,
  shiftDate,
  todayDateInput,
} from '../data/modalityCalendar';
import './ModalityDayNavigator.css';

type Props = {
  date: string;
  onChange: (date: string) => void;
};

export function ModalityDayNavigator({ date, onChange }: Props) {
  const today = todayDateInput();

  return (
    <div className="modality-day-nav">
      <div className="modality-day-nav-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm modality-day-nav-btn"
          onClick={() => onChange(shiftDate(date, -1))}
          aria-label="Dia anterior"
        >
          ‹
        </button>
        <div className="modality-day-nav-label">
          <strong>{formatCalendarDayLabel(date)}</strong>
          {isTodayDate(date) ? (
            <span className="modality-day-nav-today">Hoje</span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm modality-day-nav-btn"
          onClick={() => onChange(shiftDate(date, 1))}
          aria-label="Próximo dia"
        >
          ›
        </button>
      </div>
      {!isTodayDate(date) ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm modality-day-nav-today-btn"
          onClick={() => onChange(today)}
        >
          Ir para hoje
        </button>
      ) : null}
    </div>
  );
}
