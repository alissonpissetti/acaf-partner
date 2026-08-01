import type { ApiStore, CheckInLogEntry, GymStudent } from './types.js';

export type ValidateResult =
  | { ok: true; type: CheckInLogEntry['type']; holderName: string; message: string }
  | { ok: false; message: string };

function normalizeUnitToken(unitId: string): string {
  return unitId.toUpperCase().replace(/-/g, '_');
}

function unitIdsMatch(codeToken: string, unitId: string): boolean {
  const a = codeToken.toUpperCase().replace(/-/g, '_');
  const b = normalizeUnitToken(unitId);
  return a === b || a.endsWith(b) || b.endsWith(a);
}

export function validateCheckInCode(
  store: ApiStore,
  unitId: string,
  rawCode: string,
): ValidateResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Informe o código que o aluno mostrou no celular.' };
  }

  const unit = store.units.find((u) => u.id === unitId);
  if (!unit) {
    return { ok: false, message: 'Unidade não encontrada.' };
  }

  const now = new Date();

  if (code.startsWith('ACAF-')) {
    const issued = store.issuedCodes.find((c) => c.code.toUpperCase() === code);
    if (issued) {
      if (issued.unitId !== unitId) {
        return { ok: false, message: 'Diária emitida para outra unidade.' };
      }
      if (new Date(issued.validUntil) < now) {
        return { ok: false, message: 'Diária expirada.' };
      }
      return {
        ok: true,
        type: 'daily_pass',
        holderName: issued.holderName,
        message: `Diária válida · ${issued.holderName}`,
      };
    }

    const parts = code.split('-');
    const unitToken = parts[parts.length - 1];
    if (!unitIdsMatch(unitToken, unitId)) {
      return {
        ok: false,
        message: `Código não pertence à unidade ${unit.unitName}.`,
      };
    }

    return {
      ok: true,
      type: 'daily_pass',
      holderName: 'Visitante · diária',
      message: 'Diária reconhecida.',
    };
  }

  if (code.startsWith('CHK-')) {
    const parts = code.split('-');
    if (parts.length < 3) {
      return { ok: false, message: 'Código de check-in inválido.' };
    }
    const unitToken = parts[1];
    const dayPart = parseInt(parts[2], 10);
    if (!unitIdsMatch(unitToken, unitId)) {
      return { ok: false, message: 'Check-in Connect emitido para outra unidade.' };
    }
    if (dayPart !== now.getDate()) {
      return {
        ok: false,
        message: 'Este código só vale no dia em que foi gerado.',
      };
    }
    return {
      ok: true,
      type: 'connect_member',
      holderName: 'Associado ACAF Connect',
      message: 'Check-in Connect do dia autorizado.',
    };
  }

  return {
    ok: false,
    message: 'Código não reconhecido. Peça ao aluno para abrir o ACAF Connect e mostrar o código na tela.',
  };
}

export function applySuccessfulCheckIn(
  store: ApiStore,
  unitId: string,
  result: Extract<ValidateResult, { ok: true }>,
  code: string,
): CheckInLogEntry {
  const entry: CheckInLogEntry = {
    id: `ci-${Date.now()}`,
    unitId,
    code: code.trim().toUpperCase(),
    type: result.type,
    holderName: result.holderName,
    validatedAt: new Date().toISOString(),
  };

  store.checkInLog.push(entry);

  const today = new Date().toISOString().slice(0, 10);
  let student: GymStudent | undefined;

  if (result.type === 'daily_pass') {
    student = store.students.find(
      (s) =>
        s.unitId === unitId &&
        s.channel === 'daily_pass' &&
        result.holderName.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()),
    );
  } else if (result.type === 'connect_member') {
    student = store.students.find(
      (s) => s.unitId === unitId && s.channel === 'connect_primary',
    );
    if (!student) {
      student = store.students.find(
        (s) => s.unitId === unitId && s.channel === 'connect_visitor',
      );
      if (student) entry.type = 'connect_visitor';
    }
  }

  if (student) {
    student.checkInsThisMonth += 1;
    student.lastVisit = today;
    if (result.type === 'daily_pass') {
      student.dailyPassesThisMonth += 1;
    }
    entry.holderName = student.name;
  }

  return entry;
}

/** Gera código CHK demo igual ao app Flutter MemberCheckInScreen. */
export function demoMemberCode(unitId: string, date = new Date()): string {
  return `CHK-${normalizeUnitToken(unitId)}-${date.getDate()}`;
}
