import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchModalityReservationsRange,
  fetchModalitySlots,
  saveModalitySlotOverrides,
  saveModalitySlots,
} from '../api/client';
import { InstructorField } from '../components/InstructorField';
import { DayScheduleOverview } from '../components/DayScheduleOverview';
import { ModalityDayNavigator } from '../components/ModalityDayNavigator';
import { ModalityReservationCalendar } from '../components/ModalityReservationCalendar';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { unitEditPath } from '../data/unitEditPaths';
import {
  collectInstructorNames,
  registerInstructorName,
} from '../data/instructors';
import { buildDaySlotRows, buildDayVagaFlowRows, reservationDisplayStatus } from '../data/modalityOccurrences';
import type { DaySlotRow, DayVagaFlowRow } from '../data/modalityOccurrences';
import {
  monthKeyFromDate,
  monthRange,
  reservationCountsByDate,
  todayDateInput,
} from '../data/modalityCalendar';
import { sortModalitiesAlphabetically } from '../data/modalitySort';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import type {
  ModalityReservation,
  ModalitySlotOverride,
  ModalitySlotTemplate,
} from '../types';
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '../types';
import './ModalitySchedulePage.css';

function newTemplateId(): string {
  return `mst-${crypto.randomUUID()}`;
}

function newOverrideId(): string {
  return `mso-${crypto.randomUUID()}`;
}

const DAY_RESERVAS_LAYOUT_KEY = 'acaf-partner:day-reservas-layout';
const SCHEDULE_VIEW_MODE_KEY = 'acaf-partner:schedule-view-mode';

type DayReservasLayout = 'table' | 'cards';
type ScheduleViewMode = 'day' | 'month';

function readDayReservasLayout(): DayReservasLayout {
  try {
    const stored = localStorage.getItem(DAY_RESERVAS_LAYOUT_KEY);
    if (stored === 'table' || stored === 'cards') return stored;
  } catch {
    /* ignore */
  }
  return 'table';
}

function readScheduleViewMode(): ScheduleViewMode {
  try {
    const stored = localStorage.getItem(SCHEDULE_VIEW_MODE_KEY);
    if (stored === 'day' || stored === 'month') return stored;
  } catch {
    /* ignore */
  }
  return 'day';
}

function todayInput(): string {
  return todayDateInput();
}

const emptyTemplate = (
  modalities: string[],
  dayOfWeek: ModalitySlotTemplate['dayOfWeek'] = 'mon',
): ModalitySlotTemplate => ({
  id: newTemplateId(),
  modality: modalities[0] ?? '',
  instructorName: '',
  dayOfWeek,
  startTime: '07:00',
  endTime: '08:00',
  capacity: 10,
  active: true,
});

const emptyOverride = (modalities: string[]): ModalitySlotOverride => ({
  id: newOverrideId(),
  date: todayInput(),
  kind: 'cancel',
  modality: modalities[0] ?? '',
  instructorName: '',
  startTime: '07:00',
  endTime: '08:00',
  capacity: 10,
});

export function ModalitySchedulePage() {
  const { unit, refresh } = usePortal();
  const flash = useFlash();
  const [templates, setTemplates] = useState<ModalitySlotTemplate[]>([]);
  const [overrides, setOverrides] = useState<ModalitySlotOverride[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [monthReservations, setMonthReservations] = useState<ModalityReservation[]>([]);
  const [reservationDate, setReservationDate] = useState(todayInput());
  const [calendarMonth, setCalendarMonth] = useState(() => monthKeyFromDate(todayInput()));
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSeqRef = useRef(0);
  const [draftTemplate, setDraftTemplate] = useState<ModalitySlotTemplate | null>(null);
  const [copyToDays, setCopyToDays] = useState<ModalitySlotTemplate['dayOfWeek'][]>([]);
  const [draftOverride, setDraftOverride] = useState<ModalitySlotOverride | null>(null);
  const [weeklyGradeExpanded, setWeeklyGradeExpanded] = useState(false);
  const [overridesExpanded, setOverridesExpanded] = useState(false);
  const [dayReservasLayout, setDayReservasLayout] = useState<DayReservasLayout>(readDayReservasLayout);
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>(readScheduleViewMode);

  const sortedModalities = useMemo(
    () => sortModalitiesAlphabetically(unit.modalities),
    [unit.modalities],
  );

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchModalitySlots(unit.id);
      setTemplates(data.templates);
      setOverrides(data.overrides);
      setInstructors(data.instructors ?? collectInstructorNames(data.templates, data.overrides));
    } catch (e) {
      flash.error(e instanceof Error ? e.message : 'Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [unit.id]);

  const loadMonthReservations = useCallback(async () => {
    setLoadingReservations(true);
    try {
      const { from, to } = monthRange(calendarMonth);
      const data = await fetchModalityReservationsRange(unit.id, from, to);
      setMonthReservations(data.reservations);
    } catch {
      setMonthReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  }, [unit.id, calendarMonth]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    void loadMonthReservations();
  }, [loadMonthReservations]);

  const reservationCounts = useMemo(
    () => reservationCountsByDate(monthReservations),
    [monthReservations],
  );

  const daySlotRows = useMemo(
    () => buildDaySlotRows(reservationDate, templates, overrides, monthReservations),
    [reservationDate, templates, overrides, monthReservations],
  );

  const dayVagaFlowRows = useMemo(() => buildDayVagaFlowRows(daySlotRows), [daySlotRows]);

  const onSelectReservationDate = (date: string) => {
    setReservationDate(date);
    const nextMonth = monthKeyFromDate(date);
    if (nextMonth !== calendarMonth) {
      setCalendarMonth(nextMonth);
    }
  };

  const onCalendarMonthChange = (monthKey: string) => {
    setCalendarMonth(monthKey);
    if (!reservationDate.startsWith(monthKey)) {
      setReservationDate(`${monthKey}-01`);
    }
  };

  const templatesByDay = useMemo(() => {
    const map = new Map<ModalitySlotTemplate['dayOfWeek'], ModalitySlotTemplate[]>();
    for (const day of WEEKDAY_ORDER) map.set(day, []);
    for (const t of templates) {
      map.get(t.dayOfWeek)?.push(t);
    }
    for (const day of WEEKDAY_ORDER) {
      map.get(day)?.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [templates]);

  const totalTemplates = templates.length;

  const persistSchedule = useCallback(
    async (
      nextTemplates: ModalitySlotTemplate[],
      nextOverrides: ModalitySlotOverride[],
      nextInstructors: string[],
    ) => {
      const seq = ++persistSeqRef.current;
      setSaving(true);
      setSaveHint(null);
      try {
        await saveModalitySlots(unit.id, nextTemplates, nextInstructors);
        if (seq !== persistSeqRef.current) return;
        await saveModalitySlotOverrides(unit.id, nextOverrides);
        if (seq !== persistSeqRef.current) return;
        const data = await fetchModalitySlots(unit.id);
        if (seq !== persistSeqRef.current) return;
        setTemplates(data.templates);
        setOverrides(data.overrides);
        setInstructors(data.instructors);
        setDraftTemplate((current) => {
          if (!current) return current;
          return data.templates.find((t) => t.id === current.id) ?? current;
        });
        setDraftOverride((current) => {
          if (!current) return current;
          return data.overrides.find((o) => o.id === current.id) ?? current;
        });
        setSaveHint('Salvo');
        void refresh();
        void loadMonthReservations();
      } catch (e) {
        if (seq !== persistSeqRef.current) return;
        flash.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
        void loadSlots();
      } finally {
        if (seq === persistSeqRef.current) {
          setSaving(false);
        }
      }
    },
    [unit.id, flash, refresh, loadMonthReservations, loadSlots],
  );

  const schedulePersist = useCallback(
    (
      nextTemplates: ModalitySlotTemplate[],
      nextOverrides: ModalitySlotOverride[],
      nextInstructors: string[],
      debounceMs = 0,
    ) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const run = () => {
        void persistSchedule(nextTemplates, nextOverrides, nextInstructors);
      };
      if (debounceMs > 0) {
        saveTimerRef.current = setTimeout(run, debounceMs);
      } else {
        run();
      }
    },
    [persistSchedule],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!saveHint) return;
    const timer = setTimeout(() => setSaveHint(null), 2500);
    return () => clearTimeout(timer);
  }, [saveHint]);

  const registerInstructor = useCallback((_name: string) => {
    /* cadastro efetivo ocorre no persistSchedule (MariaDB) */
  }, []);

  const onSaveAll = async () => {
    const mergedInstructors = collectInstructorNames(templates, overrides, instructors);
    await persistSchedule(templates, overrides, mergedInstructors);
  };

  const openTemplateDraft = (draft: ModalitySlotTemplate) => {
    setWeeklyGradeExpanded(true);
    setCopyToDays([]);
    setDraftTemplate(draft);
  };

  const openOverrideDraft = (draft: ModalitySlotOverride) => {
    setOverridesExpanded(true);
    setDraftOverride(draft);
  };

  const weeklyGradeSummary =
    totalTemplates === 0
      ? 'Nenhuma faixa cadastrada'
      : `${totalTemplates} faixa${totalTemplates === 1 ? '' : 's'} na semana`;

  const overridesSummary =
    overrides.length === 0
      ? 'Nenhuma exceção cadastrada'
      : overrides.length === 1
        ? '1 exceção cadastrada'
        : `${overrides.length} exceções cadastradas`;

  const closeTemplateDraft = () => {
    setCopyToDays([]);
    setDraftTemplate(null);
  };

  const toggleCopyToDay = (day: ModalitySlotTemplate['dayOfWeek']) => {
    setCopyToDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const upsertTemplate = () => {
    if (!draftTemplate) return;
    let nextInstructors = instructors;
    if (draftTemplate.instructorName?.trim()) {
      nextInstructors = registerInstructorName(instructors, draftTemplate.instructorName);
    }

    let nextTemplates = [...templates];
    const idx = nextTemplates.findIndex((t) => t.id === draftTemplate.id);
    if (idx >= 0) {
      nextTemplates[idx] = draftTemplate;
    } else {
      nextTemplates.push(draftTemplate);
    }

    for (const day of copyToDays) {
      if (day === draftTemplate.dayOfWeek) continue;
      const duplicate = nextTemplates.some(
        (t) =>
          t.dayOfWeek === day &&
          t.modality === draftTemplate.modality &&
          t.startTime === draftTemplate.startTime &&
          t.endTime === draftTemplate.endTime,
      );
      if (duplicate) continue;
      nextTemplates.push({
        ...draftTemplate,
        id: newTemplateId(),
        dayOfWeek: day,
      });
    }

    closeTemplateDraft();
    schedulePersist(nextTemplates, overrides, nextInstructors);
  };

  const removeTemplate = (id: string) => {
    schedulePersist(
      templates.filter((t) => t.id !== id),
      overrides,
      instructors,
    );
  };

  const upsertOverride = () => {
    if (!draftOverride) return;
    let nextInstructors = instructors;
    if (draftOverride.instructorName?.trim()) {
      nextInstructors = registerInstructorName(instructors, draftOverride.instructorName);
    }

    let nextOverrides = [...overrides];
    const idx = nextOverrides.findIndex((o) => o.id === draftOverride.id);
    if (idx >= 0) {
      nextOverrides[idx] = draftOverride;
    } else {
      nextOverrides.push(draftOverride);
    }

    setDraftOverride(null);
    schedulePersist(templates, nextOverrides, nextInstructors);
  };

  const removeOverride = (id: string) => {
    schedulePersist(templates, overrides.filter((o) => o.id !== id), instructors);
  };

  useEffect(() => {
    if (!draftTemplate || saving) return;
    const existing = templates.find((t) => t.id === draftTemplate.id);
    if (!existing) return;

    const changed =
      existing.modality !== draftTemplate.modality ||
      (existing.instructorName ?? '') !== (draftTemplate.instructorName ?? '') ||
      existing.dayOfWeek !== draftTemplate.dayOfWeek ||
      existing.startTime !== draftTemplate.startTime ||
      existing.endTime !== draftTemplate.endTime ||
      existing.capacity !== draftTemplate.capacity ||
      existing.active !== draftTemplate.active;

    if (!changed) return;

    const timer = setTimeout(() => {
      let nextInstructors = instructors;
      if (draftTemplate.instructorName?.trim()) {
        nextInstructors = registerInstructorName(instructors, draftTemplate.instructorName);
      }
      const nextTemplates = templates.map((t) =>
        t.id === draftTemplate.id ? draftTemplate : t,
      );
      schedulePersist(nextTemplates, overrides, nextInstructors);
    }, 700);

    return () => clearTimeout(timer);
  }, [draftTemplate, templates, overrides, instructors, schedulePersist, saving]);

  if (!unit.modalities.length) {
    return (
      <div className="page-stack">
        <UnitScopeBanner />
        <header>
          <h1 className="page-title">Programação</h1>
          <p className="page-subtitle">
            Cadastre modalidades em{' '}
            <Link to={unitEditPath(unit.id, 'modalidades')}>Unidades → Modalidades</Link> antes de
            configurar horários.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="page-stack modality-schedule-page">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Programação</h1>
        <p className="page-subtitle">
          Visão diária da programação, calendário mensal de reservas, grade semanal e exceções.
        </p>
      </header>

      {loading ? <p className="modality-schedule-loading">Carregando agenda…</p> : null}

      <section className="card modality-schedule-section modality-schedule-section-calendar">
        <div className="modality-schedule-section-head">
          <div>
            <h2 className="section-title">
              {scheduleViewMode === 'day' ? 'Programação do dia' : 'Calendário de reservas'}
            </h2>
            <p className="modality-schedule-section-lead">
              {scheduleViewMode === 'day'
                ? 'Todos os horários e modalidades do dia selecionado — ideal para operação e recepção.'
                : 'Visão mensal das reservas no app — clique no dia para ver quem vem e em quais horários.'}
            </p>
          </div>
          <div
            className="modality-schedule-layout-segment"
            role="group"
            aria-label="Modo de visualização da agenda"
          >
            <button
              type="button"
              className={
                scheduleViewMode === 'day'
                  ? 'modality-schedule-layout-segment-btn active'
                  : 'modality-schedule-layout-segment-btn'
              }
              onClick={() => {
                setScheduleViewMode('day');
                localStorage.setItem(SCHEDULE_VIEW_MODE_KEY, 'day');
              }}
            >
              Dia
            </button>
            <button
              type="button"
              className={
                scheduleViewMode === 'month'
                  ? 'modality-schedule-layout-segment-btn active'
                  : 'modality-schedule-layout-segment-btn'
              }
              onClick={() => {
                setScheduleViewMode('month');
                localStorage.setItem(SCHEDULE_VIEW_MODE_KEY, 'month');
              }}
            >
              Mês
            </button>
          </div>
        </div>

        {scheduleViewMode === 'day' ? (
          <>
            <ModalityDayNavigator date={reservationDate} onChange={onSelectReservationDate} />
            <DayScheduleOverview
              date={reservationDate}
              rows={daySlotRows}
              loading={loading || loadingReservations}
            />
          </>
        ) : (
          <ModalityReservationCalendar
            monthKey={calendarMonth}
            selectedDate={reservationDate}
            countsByDate={reservationCounts}
            loading={loadingReservations}
            onMonthChange={onCalendarMonthChange}
            onSelectDate={onSelectReservationDate}
          />
        )}

        <div className="modality-schedule-day-detail">
          <div className="modality-schedule-day-detail-head">
            <h3 className="modality-schedule-day-detail-title">Reservas do dia</h3>
            {!loading && !loadingReservations && daySlotRows.length > 0 ? (
              <div
                className="modality-schedule-layout-segment"
                role="group"
                aria-label="Layout das reservas do dia"
              >
                <button
                  type="button"
                  className={
                    dayReservasLayout === 'table'
                      ? 'modality-schedule-layout-segment-btn active'
                      : 'modality-schedule-layout-segment-btn'
                  }
                  onClick={() => {
                    setDayReservasLayout('table');
                    localStorage.setItem(DAY_RESERVAS_LAYOUT_KEY, 'table');
                  }}
                >
                  Tabela
                </button>
                <button
                  type="button"
                  className={
                    dayReservasLayout === 'cards'
                      ? 'modality-schedule-layout-segment-btn active'
                      : 'modality-schedule-layout-segment-btn'
                  }
                  onClick={() => {
                    setDayReservasLayout('cards');
                    localStorage.setItem(DAY_RESERVAS_LAYOUT_KEY, 'cards');
                  }}
                >
                  Cards
                </button>
              </div>
            ) : null}
          </div>
          {loading || loadingReservations ? (
            <p className="modality-schedule-empty">Carregando vagas…</p>
          ) : daySlotRows.length === 0 ? (
            <p className="modality-schedule-empty">Nenhuma vaga programada para esta data.</p>
          ) : dayReservasLayout === 'cards' ? (
            <DayReservasCards rows={daySlotRows} />
          ) : (
            <DayReservasTable rows={dayVagaFlowRows} />
          )}
        </div>
      </section>

      <CollapsibleScheduleSection
        title="Grade semanal"
        summary={weeklyGradeSummary}
        expanded={weeklyGradeExpanded}
        onToggle={() => setWeeklyGradeExpanded((prev) => !prev)}
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openTemplateDraft(emptyTemplate(sortedModalities))}
          >
            Nova faixa
          </button>
        }
      >
        {draftTemplate ? (
          <TemplateForm
            draft={draftTemplate}
            modalities={sortedModalities}
            instructors={instructors}
            copyToDays={copyToDays}
            onToggleCopyDay={toggleCopyToDay}
            onRegisterInstructor={registerInstructor}
            onChange={(next) => {
              if (next.dayOfWeek !== draftTemplate.dayOfWeek) {
                setCopyToDays((prev) => prev.filter((d) => d !== next.dayOfWeek));
              }
              setDraftTemplate(next);
            }}
            onCancel={closeTemplateDraft}
            onSubmit={upsertTemplate}
          />
        ) : null}

        <div className="modality-schedule-week">
          {WEEKDAY_ORDER.map((day) => {
            const daySlots = templatesByDay.get(day) ?? [];
            return (
              <div
                key={day}
                className={`modality-schedule-day-block ${daySlots.length === 0 ? 'is-empty' : ''}`}
              >
                <div className="modality-schedule-day-head">
                  <div className="modality-schedule-day-title">
                    <h3>{WEEKDAY_LABELS[day]}</h3>
                    <span className="modality-schedule-day-count">
                      {daySlots.length === 0
                        ? 'Sem faixas'
                        : `${daySlots.length} faixa${daySlots.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openTemplateDraft(emptyTemplate(sortedModalities, day))}
                  >
                    Adicionar
                  </button>
                </div>

                {daySlots.length === 0 ? (
                  <p className="modality-schedule-day-empty">Nenhuma aula neste dia.</p>
                ) : (
                  <div className="modality-schedule-slots-wrap">
                    <table className="modality-schedule-slots-table">
                      <thead>
                        <tr>
                          <th>Horário</th>
                          <th>Modalidade</th>
                          <th>Professor</th>
                          <th>Vagas</th>
                          <th>Status</th>
                          <th aria-label="Ações" />
                        </tr>
                      </thead>
                      <tbody>
                        {daySlots.map((t) => (
                          <tr key={t.id} className={t.active ? undefined : 'is-inactive'}>
                            <td className="modality-schedule-slot-time">
                              {t.startTime}–{t.endTime}
                            </td>
                            <td className="modality-schedule-slot-modality">{t.modality}</td>
                            <td>{t.instructorName ? `Prof. ${t.instructorName}` : '—'}</td>
                            <td className="modality-schedule-slot-capacity">{t.capacity}</td>
                            <td>
                              {t.active ? (
                                <span className="modality-schedule-status modality-schedule-status-active">
                                  Ativa
                                </span>
                              ) : (
                                <span className="modality-schedule-status modality-schedule-status-paused">
                                  Inativa
                                </span>
                              )}
                            </td>
                            <td className="modality-schedule-slot-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openTemplateDraft(t)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm modality-schedule-delete"
                                onClick={() => removeTemplate(t.id)}
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleScheduleSection>

      <CollapsibleScheduleSection
        title="Exceções por data"
        summary={overridesSummary}
        expanded={overridesExpanded}
        onToggle={() => setOverridesExpanded((prev) => !prev)}
        className="modality-schedule-section-overrides"
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openOverrideDraft(emptyOverride(sortedModalities))}
          >
            Nova exceção
          </button>
        }
      >
        {draftOverride ? (
          <OverrideForm
            draft={draftOverride}
            modalities={sortedModalities}
            templates={templates}
            instructors={instructors}
            onRegisterInstructor={registerInstructor}
            onChange={setDraftOverride}
            onCancel={() => setDraftOverride(null)}
            onSubmit={upsertOverride}
          />
        ) : null}

        {overrides.length === 0 ? (
          <p className="modality-schedule-empty">Nenhuma exceção cadastrada.</p>
        ) : (
          <table className="modality-schedule-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Modalidade</th>
                <th>Horário</th>
                <th>Detalhe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.date}</td>
                  <td>{overrideKindLabel(o.kind)}</td>
                  <td>{o.modality}</td>
                  <td>
                    {o.kind === 'cancel'
                      ? '—'
                      : `${o.startTime}–${o.endTime}${o.capacity ? ` · ${o.capacity} vagas` : ''}`}
                  </td>
                  <td>
                    {o.kind !== 'extra' && o.slotTemplateId
                      ? `Faixa ${templates.find((t) => t.id === o.slotTemplateId)?.modality ?? o.slotTemplateId}`
                      : o.instructorName
                        ? `Prof. ${o.instructorName}`
                        : '—'}
                  </td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => openOverrideDraft(o)}>
                      Editar
                    </button>
                    <button type="button" className="btn-link danger" onClick={() => removeOverride(o.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleScheduleSection>

      <div className="modality-schedule-footer">
        <span className="modality-schedule-save-hint">
          {saving ? 'Salvando…' : saveHint ?? 'Salvo na base de dados'}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={saving || loading}
          onClick={() => void onSaveAll()}
        >
          Salvar agora
        </button>
      </div>
    </div>
  );
}

function DayReservasTable({ rows }: { rows: DayVagaFlowRow[] }) {
  return (
    <div className="modality-schedule-day-slots-wrap">
      <table className="modality-schedule-table modality-schedule-day-slots-table">
        <thead>
          <tr>
            <th>Horário</th>
            <th>Modalidade</th>
            <th>Professor</th>
            <th>Vaga</th>
            <th>Aluno</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={
                row.statusVariant === 'available' && !row.holderName
                  ? 'modality-schedule-day-slot-empty'
                  : undefined
              }
            >
              {row.isFlowStart ? (
                <>
                  <td className="modality-schedule-slot-time" rowSpan={row.flowRowSpan}>
                    {row.startTime}–{row.endTime}
                  </td>
                  <td rowSpan={row.flowRowSpan}>{row.modality}</td>
                  <td rowSpan={row.flowRowSpan}>
                    {row.instructorName ? `Prof. ${row.instructorName}` : '—'}
                  </td>
                </>
              ) : null}
              <td className="modality-schedule-slot-capacity">{row.vagaLabel}</td>
              <td>{row.holderName ?? '—'}</td>
              <td>
                <span
                  className={`modality-schedule-vaga-status modality-schedule-vaga-status--${row.statusVariant}`}
                >
                  {row.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayReservasCards({ rows }: { rows: DaySlotRow[] }) {
  return (
    <div className="modality-schedule-flow-cards">
      {rows.map((slot) => {
        const fillRatio = slot.capacity > 0 ? slot.booked / slot.capacity : 0;
        const isFull = slot.available === 0 && slot.booked > 0;

        return (
          <article key={slot.occurrenceKey} className="modality-schedule-flow-card">
            <header className="modality-schedule-flow-card-head">
              <div className="modality-schedule-flow-card-main">
                <div className="modality-schedule-flow-card-time">
                  {slot.startTime}–{slot.endTime}
                </div>
                <div className="modality-schedule-flow-card-meta">
                  <strong>{slot.modality}</strong>
                  {slot.instructorName ? (
                    <span>Prof. {slot.instructorName}</span>
                  ) : (
                    <span className="modality-schedule-flow-card-muted">Sem professor</span>
                  )}
                </div>
              </div>
              <div className="modality-schedule-flow-card-occupancy">
                <strong>
                  {slot.booked}/{slot.capacity}
                </strong>
                {slot.available > 0 ? (
                  <span>{slot.available} livre{slot.available === 1 ? '' : 's'}</span>
                ) : isFull ? (
                  <span className="modality-schedule-flow-card-full">Lotado</span>
                ) : null}
                <div className="modality-schedule-flow-card-bar" aria-hidden>
                  <div
                    className="modality-schedule-flow-card-bar-fill"
                    style={{ width: `${Math.round(fillRatio * 100)}%` }}
                  />
                </div>
              </div>
            </header>
            <ul className="modality-schedule-flow-card-roster">
              {slot.reservations.map((reservation, index) => {
                const { label, variant } = reservationDisplayStatus(
                  reservation,
                  slot.occurrenceDate,
                );
                return (
                  <li key={reservation.id}>
                    <span className="modality-schedule-flow-card-vaga">{index + 1}</span>
                    <span className="modality-schedule-flow-card-name">{reservation.holderName}</span>
                    <span
                      className={`modality-schedule-vaga-status modality-schedule-vaga-status--${variant}`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
              {slot.booked === 0 ? (
                <li className="modality-schedule-flow-card-empty">
                  {slot.capacity} vagas disponíveis
                </li>
              ) : slot.available > 0 ? (
                <li className="modality-schedule-flow-card-empty">
                  +{' '}
                  {slot.available === 1
                    ? '1 vaga disponível'
                    : `${slot.available} vagas disponíveis`}
                </li>
              ) : null}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

function CollapsibleScheduleSection({
  title,
  summary,
  expanded,
  onToggle,
  actions,
  children,
  className,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`card modality-schedule-section modality-schedule-collapsible ${expanded ? 'is-expanded' : 'is-collapsed'} ${className ?? ''}`.trim()}
    >
      <div className="modality-schedule-section-head">
        <button
          type="button"
          className="modality-schedule-collapsible-trigger"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="modality-schedule-collapsible-main">
            <span className="modality-schedule-collapsible-title-row">
              <span className="modality-schedule-collapsible-chevron" aria-hidden>
                {expanded ? '▾' : '▸'}
              </span>
              <h2 className="section-title">{title}</h2>
            </span>
            <p className="modality-schedule-section-lead">{summary}</p>
          </span>
        </button>
        {actions ? <div className="modality-schedule-section-actions">{actions}</div> : null}
      </div>
      {expanded ? <div className="modality-schedule-collapsible-body">{children}</div> : null}
    </section>
  );
}

function overrideKindLabel(kind: ModalitySlotOverride['kind']): string {
  if (kind === 'cancel') return 'Cancelar';
  if (kind === 'patch') return 'Alterar';
  return 'Extra';
}

function TemplateForm({
  draft,
  modalities,
  instructors,
  copyToDays,
  onToggleCopyDay,
  onRegisterInstructor,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: ModalitySlotTemplate;
  modalities: string[];
  instructors: string[];
  copyToDays: ModalitySlotTemplate['dayOfWeek'][];
  onToggleCopyDay: (day: ModalitySlotTemplate['dayOfWeek']) => void;
  onRegisterInstructor: (name: string) => void;
  onChange: (next: ModalitySlotTemplate) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const copyTargets = WEEKDAY_ORDER.filter((d) => d !== draft.dayOfWeek);

  return (
    <div className="modality-schedule-form card-inner">
      <div className="form-grid form-grid-2">
        <div className="field">
          <label>Modalidade</label>
          <select
            value={draft.modality}
            onChange={(ev) => onChange({ ...draft, modality: ev.target.value })}
          >
            {modalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="template-instructor">Professor (opcional)</label>
          <InstructorField
            id="template-instructor"
            value={draft.instructorName ?? ''}
            instructors={instructors}
            onRegister={onRegisterInstructor}
            onChange={(name) => onChange({ ...draft, instructorName: name })}
          />
        </div>
        <div className="field">
          <label>Dia da semana</label>
          <select
            value={draft.dayOfWeek}
            onChange={(ev) =>
              onChange({ ...draft, dayOfWeek: ev.target.value as ModalitySlotTemplate['dayOfWeek'] })
            }
          >
            {WEEKDAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Vagas</label>
          <input
            type="number"
            min={1}
            value={draft.capacity}
            onChange={(ev) => onChange({ ...draft, capacity: Number(ev.target.value) })}
          />
        </div>
        <div className="field">
          <label>De</label>
          <input
            type="time"
            value={draft.startTime}
            onChange={(ev) => onChange({ ...draft, startTime: ev.target.value })}
          />
        </div>
        <div className="field">
          <label>Até</label>
          <input
            type="time"
            value={draft.endTime}
            onChange={(ev) => onChange({ ...draft, endTime: ev.target.value })}
          />
        </div>
        <div className="field field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(ev) => onChange({ ...draft, active: ev.target.checked })}
            />
            Faixa ativa
          </label>
        </div>
        <div className="field field-span-2 modality-schedule-copy-field">
          <label>Copiar também para</label>
          <p className="modality-schedule-copy-hint">
            Marque os dias em que a mesma faixa (horário, modalidade e vagas) deve se repetir.
          </p>
          <div className="modality-schedule-copy-days">
            {copyTargets.map((day) => (
              <label key={day} className="modality-schedule-copy-day">
                <input
                  type="checkbox"
                  checked={copyToDays.includes(day)}
                  onChange={() => onToggleCopyDay(day)}
                />
                {WEEKDAY_LABELS[day]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="modality-schedule-form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSubmit}>
          {copyToDays.length > 0 ? `Aplicar em ${copyToDays.length + 1} dias` : 'Aplicar'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function OverrideForm({
  draft,
  modalities,
  templates,
  instructors,
  onRegisterInstructor,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: ModalitySlotOverride;
  modalities: string[];
  templates: ModalitySlotTemplate[];
  instructors: string[];
  onRegisterInstructor: (name: string) => void;
  onChange: (next: ModalitySlotOverride) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="modality-schedule-form card-inner">
      <div className="form-grid form-grid-2">
        <div className="field">
          <label>Data</label>
          <input
            type="date"
            value={draft.date}
            onChange={(ev) => onChange({ ...draft, date: ev.target.value })}
          />
        </div>
        <div className="field">
          <label>Tipo</label>
          <select
            value={draft.kind}
            onChange={(ev) =>
              onChange({ ...draft, kind: ev.target.value as ModalitySlotOverride['kind'] })
            }
          >
            <option value="cancel">Cancelar aula recorrente</option>
            <option value="patch">Alterar ocorrência</option>
            <option value="extra">Aula extra</option>
          </select>
        </div>
        {draft.kind !== 'extra' ? (
          <div className="field">
            <label>Faixa recorrente</label>
            <select
              value={draft.slotTemplateId ?? ''}
              onChange={(ev) => {
                const tpl = templates.find((t) => t.id === ev.target.value);
                onChange({
                  ...draft,
                  slotTemplateId: ev.target.value || undefined,
                  modality: tpl?.modality ?? draft.modality,
                  startTime: tpl?.startTime ?? draft.startTime,
                  endTime: tpl?.endTime ?? draft.endTime,
                });
              }}
            >
              <option value="">Selecione…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {WEEKDAY_LABELS[t.dayOfWeek]} · {t.modality} · {t.startTime}–{t.endTime}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="field">
          <label>Modalidade</label>
          <select
            value={draft.modality}
            onChange={(ev) => onChange({ ...draft, modality: ev.target.value })}
          >
            {modalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        {draft.kind !== 'cancel' ? (
          <>
            <div className="field">
              <label htmlFor="override-instructor">Professor (opcional)</label>
              <InstructorField
                id="override-instructor"
                value={draft.instructorName ?? ''}
                instructors={instructors}
                onRegister={onRegisterInstructor}
                onChange={(name) => onChange({ ...draft, instructorName: name })}
              />
            </div>
            <div className="field">
              <label>Vagas</label>
              <input
                type="number"
                min={1}
                value={draft.capacity ?? 10}
                onChange={(ev) => onChange({ ...draft, capacity: Number(ev.target.value) })}
              />
            </div>
            <div className="field">
              <label>De</label>
              <input
                type="time"
                value={draft.startTime}
                onChange={(ev) => onChange({ ...draft, startTime: ev.target.value })}
              />
            </div>
            <div className="field">
              <label>Até</label>
              <input
                type="time"
                value={draft.endTime}
                onChange={(ev) => onChange({ ...draft, endTime: ev.target.value })}
              />
            </div>
          </>
        ) : null}
      </div>
      <div className="modality-schedule-form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSubmit}>
          Aplicar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
