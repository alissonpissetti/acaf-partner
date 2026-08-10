import { useEffect, useRef, useState } from 'react';
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  formatWeeklyScheduleSummary,
  isWeeklyScheduleComplete,
  type UnitWeeklySchedule,
} from '../data/weeklySchedule';

type Props = {
  value: UnitWeeklySchedule;
  onChange: (next: UnitWeeklySchedule) => void;
  disabled?: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  embedded?: boolean;
};

export function UnitWeeklyHoursFields({
  value,
  onChange,
  disabled = false,
  collapsible = false,
  expanded: expandedProp,
  onExpandedChange,
  embedded = false,
}: Props) {
  const complete = isWeeklyScheduleComplete(value);
  const initialized = useRef(false);
  const [expandedInternal, setExpandedInternal] = useState(() => !complete);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;

  useEffect(() => {
    if (!collapsible || expandedProp !== undefined || initialized.current) return;
    initialized.current = true;
    setExpanded(!complete);
  }, [collapsible, complete, expandedProp, setExpanded]);

  const patchDay = (day: (typeof WEEKDAY_ORDER)[number], patch: Partial<UnitWeeklySchedule[typeof day]>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...patch },
    });
  };

  const toggleExpanded = () => {
    if (!collapsible) return;
    setExpanded(!expanded);
  };

  const editor = (
    <div className="weekly-hours-table">
      <div className="weekly-hours-table-head">
        <span>Dia</span>
        <span>Abre</span>
        <span>Fecha</span>
        <span>Fechado</span>
      </div>
      {WEEKDAY_ORDER.map((day) => {
        const row = value[day];
        return (
          <div key={day} className="weekly-hours-table-row">
            <span className="weekly-hours-day">{WEEKDAY_LABELS[day]}</span>
            <div className="weekly-hours-time-field">
              <input
                type="time"
                className="weekly-hours-time-input"
                value={row.open}
                onChange={(e) => patchDay(day, { open: e.target.value })}
                disabled={disabled || row.closed}
              />
            </div>
            <div className="weekly-hours-time-field">
              <input
                type="time"
                className="weekly-hours-time-input"
                value={row.close}
                onChange={(e) => patchDay(day, { close: e.target.value })}
                disabled={disabled || row.closed}
              />
            </div>
            <label className="weekly-hours-closed">
              <input
                type="checkbox"
                className="weekly-hours-closed-input"
                checked={row.closed}
                onChange={(e) => patchDay(day, { closed: e.target.checked })}
                disabled={disabled}
              />
              <span>Fechado</span>
            </label>
          </div>
        );
      })}
    </div>
  );

  if (!collapsible) {
    return (
      <div className={embedded ? 'weekly-hours weekly-hours-embedded' : 'weekly-hours'}>
        {editor}
      </div>
    );
  }

  return (
    <div className={`weekly-hours weekly-hours-collapsible ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span className="collapsible-header-main">
          <strong>Horário de funcionamento</strong>
          {!expanded ? (
            <span className="collapsible-summary">{formatWeeklyScheduleSummary(value)}</span>
          ) : null}
        </span>
        <span className="collapsible-chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded ? editor : null}
    </div>
  );
}
