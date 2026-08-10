import { effectiveDailyPassModalities } from './dailyPassModalities';
import type { DayOfWeek } from './weeklySchedule';
import { WEEKDAY_ORDER } from './weeklySchedule';
import {
  dailyPassAcafFee,
  dailyPassGymNet,
  roundDailyPassPrice,
} from './acafFees';
import type { DailyPassPricingRule, GymUnit } from '../types';

const JS_DAY_TO_KEY: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseTimeMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value.trim());
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function effectiveDailyPassModalitiesForRules(unit: GymUnit): string[] {
  return effectiveDailyPassModalities(unit);
}

export function createEmptyPricingRule(unit: GymUnit): DailyPassPricingRule {
  const mods = effectiveDailyPassModalities(unit);
  return {
    id: crypto.randomUUID(),
    label: '',
    daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '10:00',
    endTime: '14:00',
    modalities: mods.length > 0 ? [mods[0]!] : [],
    price: roundDailyPassPrice(unit.dailyPassPrice * 0.55),
    active: true,
  };
}

export function validateDailyPassPricingRulesClient(
  unit: GymUnit,
  rules: DailyPassPricingRule[],
): string | null {
  const active = rules.filter((r) => r.active);

  for (let i = 0; i < active.length; i += 1) {
    const a = active[i]!;
    if (!a.daysOfWeek.length || !a.modalities.length) {
      return 'Cada faixa ativa precisa de dias e modalidades.';
    }
    if (!isValidTime(a.startTime) || !isValidTime(a.endTime)) {
      return 'Horários inválidos em uma faixa promocional.';
    }
    if (parseTimeMinutes(a.startTime) >= parseTimeMinutes(a.endTime)) {
      return 'O horário de início deve ser anterior ao fim.';
    }

    const aStart = parseTimeMinutes(a.startTime);
    const aEnd = parseTimeMinutes(a.endTime);

    for (let j = i + 1; j < active.length; j += 1) {
      const b = active[j]!;
      const sharedDays = a.daysOfWeek.filter((d) => b.daysOfWeek.includes(d));
      if (!sharedDays.length) continue;

      const sharedMods = a.modalities.filter((m) =>
        b.modalities.some((x) => x.toLowerCase() === m.toLowerCase()),
      );
      if (!sharedMods.length) continue;

      const bStart = parseTimeMinutes(b.startTime);
      const bEnd = parseTimeMinutes(b.endTime);
      if (intervalsOverlap(aStart, aEnd, bStart, bEnd)) {
        const mod = sharedMods[0];
        return `Faixas se sobrepõem em horário para ${mod}.`;
      }
    }
  }

  if (unit.dailyPassActive) {
    const integralMods = effectiveDailyPassModalitiesForRules(unit);
    const hasActiveRules = active.some((r) => r.modalities.length > 0);
    if (integralMods.length === 0 && !hasActiveRules) {
      return 'Ative modalidades na diária integral ou cadastre faixas promocionais.';
    }
  }

  return null;
}

export function formatRuleDays(days: DayOfWeek[]): string {
  if (days.length === WEEKDAY_ORDER.length) return 'Todos os dias';
  const short: Record<DayOfWeek, string> = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
  };
  return days.map((d) => short[d]).join(', ');
}

export function formatRuleTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export function pricingRuleNetSimulation(price: number): { fee: number; net: number } {
  return {
    fee: dailyPassAcafFee(price),
    net: dailyPassGymNet(price),
  };
}

export function dayKeyFromDate(date: string): DayOfWeek {
  const d = new Date(`${date}T12:00:00`);
  return JS_DAY_TO_KEY[d.getDay()]!;
}
