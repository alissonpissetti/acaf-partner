import type {
  ModalityReservation,
  ModalitySlotOverride,
  ModalitySlotTemplate,
} from '../types';
import { todayDateInput } from './modalityCalendar';

export type ModalityOccurrence = {
  occurrenceKey: string;
  occurrenceDate: string;
  slotTemplateId?: string;
  overrideId?: string;
  modality: string;
  instructorName?: string;
  startTime: string;
  endTime: string;
  capacity: number;
};

const JS_DAY_TO_KEY: ModalitySlotTemplate['dayOfWeek'][] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

function dayKeyFromDate(date: string): ModalitySlotTemplate['dayOfWeek'] {
  const d = new Date(`${date}T12:00:00`);
  return JS_DAY_TO_KEY[d.getDay()];
}

function parseTimeMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function buildOccurrenceKey(input: {
  occurrenceDate: string;
  startTime: string;
  endTime: string;
  modality: string;
  slotTemplateId?: string;
  overrideId?: string;
}): string {
  const ref = input.overrideId ?? input.slotTemplateId ?? 'adhoc';
  return `${input.occurrenceDate}|${input.startTime}|${input.endTime}|${input.modality}|${ref}`;
}

function findPatchOverride(
  overrides: ModalitySlotOverride[],
  date: string,
  templateId: string,
): ModalitySlotOverride | undefined {
  return overrides.find(
    (o) => o.kind === 'patch' && o.date === date && o.slotTemplateId === templateId,
  );
}

function isCancelled(
  overrides: ModalitySlotOverride[],
  date: string,
  templateId: string,
): boolean {
  return overrides.some(
    (o) => o.kind === 'cancel' && o.date === date && o.slotTemplateId === templateId,
  );
}

export function expandOccurrencesForDate(
  date: string,
  templates: ModalitySlotTemplate[],
  overrides: ModalitySlotOverride[],
): ModalityOccurrence[] {
  const dayKey = dayKeyFromDate(date);
  const occurrences: ModalityOccurrence[] = [];

  for (const template of templates) {
    if (!template.active || template.dayOfWeek !== dayKey) continue;
    if (isCancelled(overrides, date, template.id)) continue;

    const patch = findPatchOverride(overrides, date, template.id);
    const startTime = patch?.startTime ?? template.startTime;
    const endTime = patch?.endTime ?? template.endTime;
    const capacity = patch?.capacity ?? template.capacity;
    const instructorName = patch?.instructorName ?? template.instructorName;

    occurrences.push({
      occurrenceKey: buildOccurrenceKey({
        occurrenceDate: date,
        startTime,
        endTime,
        modality: template.modality,
        slotTemplateId: template.id,
      }),
      occurrenceDate: date,
      slotTemplateId: template.id,
      modality: template.modality,
      instructorName,
      startTime,
      endTime,
      capacity,
    });
  }

  for (const extra of overrides) {
    if (extra.kind !== 'extra' || extra.date !== date) continue;
    const capacity = extra.capacity ?? 1;
    occurrences.push({
      occurrenceKey: buildOccurrenceKey({
        occurrenceDate: date,
        startTime: extra.startTime,
        endTime: extra.endTime,
        modality: extra.modality,
        overrideId: extra.id,
      }),
      occurrenceDate: date,
      overrideId: extra.id,
      modality: extra.modality,
      instructorName: extra.instructorName,
      startTime: extra.startTime,
      endTime: extra.endTime,
      capacity,
    });
  }

  return occurrences.sort(
    (a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime),
  );
}

export function reservationsForOccurrence(
  reservations: ModalityReservation[],
  occurrence: ModalityOccurrence,
): ModalityReservation[] {
  const base = (r: ModalityReservation) =>
    r.status !== 'cancelled' &&
    r.occurrenceDate === occurrence.occurrenceDate &&
    r.startTime === occurrence.startTime &&
    r.endTime === occurrence.endTime &&
    r.modality.toLowerCase() === occurrence.modality.toLowerCase();

  const strict = reservations.filter(
    (r) =>
      base(r) &&
      (occurrence.slotTemplateId
        ? r.slotTemplateId === occurrence.slotTemplateId
        : r.overrideId === occurrence.overrideId),
  );
  if (strict.length > 0) return strict;

  return reservations.filter(base);
}

export type DaySlotRow = ModalityOccurrence & {
  booked: number;
  available: number;
  reservations: ModalityReservation[];
};

export type DayVagaFlowRow = {
  id: string;
  occurrenceKey: string;
  startTime: string;
  endTime: string;
  modality: string;
  instructorName?: string;
  capacity: number;
  vagaLabel: string;
  holderName: string | null;
  statusLabel: string;
  statusVariant: 'available' | 'confirmed' | 'checked_in' | 'cancelled';
  isFlowStart: boolean;
  flowRowSpan: number;
};

export function reservationDisplayStatus(
  reservation: ModalityReservation,
  occurrenceDate: string,
): {
  label: string;
  variant: DayVagaFlowRow['statusVariant'];
} {
  const isFuture = occurrenceDate > todayDateInput();
  if (reservation.status === 'checked_in') {
    if (isFuture) return { label: 'Confirmada', variant: 'confirmed' };
    return { label: 'Check-in feito', variant: 'checked_in' };
  }
  if (reservation.status === 'cancelled') {
    return { label: 'Cancelada', variant: 'cancelled' };
  }
  return { label: 'Confirmada', variant: 'confirmed' };
}

/** Expande cada faixa do dia em linhas de vaga (uma por aluno + resumo de livres). */
export function buildDayVagaFlowRows(daySlotRows: DaySlotRow[]): DayVagaFlowRow[] {
  const rows: DayVagaFlowRow[] = [];

  for (const slot of daySlotRows) {
    const flowRows: DayVagaFlowRow[] = [];

    slot.reservations.forEach((reservation, index) => {
      const { label, variant } = reservationDisplayStatus(reservation, slot.occurrenceDate);
      flowRows.push({
        id: `${slot.occurrenceKey}|r|${reservation.id}`,
        occurrenceKey: slot.occurrenceKey,
        startTime: slot.startTime,
        endTime: slot.endTime,
        modality: slot.modality,
        instructorName: slot.instructorName,
        capacity: slot.capacity,
        vagaLabel: `${index + 1}/${slot.capacity}`,
        holderName: reservation.holderName,
        statusLabel: label,
        statusVariant: variant,
        isFlowStart: false,
        flowRowSpan: 0,
      });
    });

    if (slot.booked === 0) {
      flowRows.push({
        id: `${slot.occurrenceKey}|empty`,
        occurrenceKey: slot.occurrenceKey,
        startTime: slot.startTime,
        endTime: slot.endTime,
        modality: slot.modality,
        instructorName: slot.instructorName,
        capacity: slot.capacity,
        vagaLabel: `0/${slot.capacity}`,
        holderName: null,
        statusLabel: `${slot.capacity} vagas disponíveis`,
        statusVariant: 'available',
        isFlowStart: false,
        flowRowSpan: 0,
      });
    } else if (slot.available > 0) {
      flowRows.push({
        id: `${slot.occurrenceKey}|free`,
        occurrenceKey: slot.occurrenceKey,
        startTime: slot.startTime,
        endTime: slot.endTime,
        modality: slot.modality,
        instructorName: slot.instructorName,
        capacity: slot.capacity,
        vagaLabel: `${slot.booked + 1}–${slot.capacity}/${slot.capacity}`,
        holderName: null,
        statusLabel:
          slot.available === 1
            ? '1 vaga disponível'
            : `${slot.available} vagas disponíveis`,
        statusVariant: 'available',
        isFlowStart: false,
        flowRowSpan: 0,
      });
    }

    if (flowRows.length === 0) continue;

    flowRows[0].isFlowStart = true;
    flowRows[0].flowRowSpan = flowRows.length;
    rows.push(...flowRows);
  }

  return rows;
}

export function buildDaySlotRows(
  date: string,
  templates: ModalitySlotTemplate[],
  overrides: ModalitySlotOverride[],
  reservations: ModalityReservation[],
): DaySlotRow[] {
  return expandOccurrencesForDate(date, templates, overrides).map((occurrence) => {
    const matched = reservationsForOccurrence(reservations, occurrence);
    const booked = matched.length;
    return {
      ...occurrence,
      booked,
      available: Math.max(0, occurrence.capacity - booked),
      reservations: matched,
    };
  });
}

export function slotTimePhase(
  occurrenceDate: string,
  startTime: string,
  endTime: string,
): 'past' | 'now' | 'upcoming' {
  const today = todayDateInput();
  if (occurrenceDate < today) return 'past';
  if (occurrenceDate > today) return 'upcoming';

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeMinutes(startTime);
  const end = parseTimeMinutes(endTime);
  if (mins >= end) return 'past';
  if (mins >= start) return 'now';
  return 'upcoming';
}

export function daySlotOccupancyLabel(slot: DaySlotRow): string {
  if (slot.booked === 0) {
    return slot.capacity === 1 ? '0/1 · 1 livre' : `0/${slot.capacity} · ${slot.capacity} livres`;
  }
  if (slot.available === 0) {
    return `${slot.booked}/${slot.capacity} · Lotado`;
  }
  const freeLabel = slot.available === 1 ? '1 livre' : `${slot.available} livres`;
  return `${slot.booked}/${slot.capacity} · ${freeLabel}`;
}

export function daySlotReservationsSummary(slot: DaySlotRow, occurrenceDate: string): string {
  if (slot.booked === 0) return 'Sem reservas';

  const isFuture = occurrenceDate > todayDateInput();
  const checkedIn = isFuture
    ? 0
    : slot.reservations.filter((r) => r.status === 'checked_in').length;
  const confirmed = slot.reservations.filter((r) => r.status === 'confirmed').length;

  if (checkedIn > 0 && confirmed === 0) {
    return checkedIn === 1 ? '1 check-in' : `${checkedIn} check-ins`;
  }
  if (checkedIn > 0 && confirmed > 0) {
    return `${checkedIn} check-in · ${confirmed} confirmada${confirmed === 1 ? '' : 's'}`;
  }
  return slot.booked === 1 ? '1 confirmada' : `${slot.booked} confirmadas`;
}