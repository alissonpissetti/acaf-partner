export type PartnerOnboardingWizardStep = 1 | 2 | 3 | 4;

export const PARTNER_ONBOARDING_WIZARD_DONE_KEY = 'connect_partner_onboarding_wizard_done';

const WIZARD_STEP_KEY_PREFIX = 'connect_partner_onboarding_wizard_step';
const WIZARD_DRAFT_KEY_PREFIX = 'connect_partner_onboarding_wizard_draft';
/** 2 = fluxo com passo de termos (rede/unidades deslocados). */
const WIZARD_SCHEMA_VERSION = 2;

/** Campos do passo 1 persistidos localmente (sem senha). */
export type PartnerOnboardingStep1Draft = {
  name: string;
  email: string;
  cpfDisplay: string;
  phoneDisplay: string;
  updatedAt: number;
};

export const ONBOARDING_WIZARD_STEPS: { step: PartnerOnboardingWizardStep; label: string }[] = [
  { step: 1, label: 'Seu acesso' },
  { step: 2, label: 'Termos' },
  { step: 3, label: 'Dados da rede' },
  { step: 4, label: 'Unidades' },
];

type StoredWizardStep = {
  step: PartnerOnboardingWizardStep;
  updatedAt: number;
  networkId?: string;
  token?: string;
  wizardSchema?: number;
};

function clampWizardStep(value: number): PartnerOnboardingWizardStep {
  if (value <= 1) return 1;
  if (value >= 4) return 4;
  if (value === 3) return 3;
  if (value === 2) return 2;
  return 2;
}

function normalizeStoredStep(raw: StoredWizardStep): StoredWizardStep {
  let step = raw.step;
  if (raw.wizardSchema !== WIZARD_SCHEMA_VERSION && (step === 2 || step === 3)) {
    step = (step + 1) as PartnerOnboardingWizardStep;
  }
  return { ...raw, step: clampWizardStep(step), wizardSchema: WIZARD_SCHEMA_VERSION };
}

function storageKeyForToken(token: string): string {
  return `${WIZARD_STEP_KEY_PREFIX}:token:${token}`;
}

function storageKeyForNetwork(networkId: string): string {
  return `${WIZARD_STEP_KEY_PREFIX}:network:${networkId}`;
}

function draftStorageKeyForToken(token: string): string {
  return `${WIZARD_DRAFT_KEY_PREFIX}:token:${token}`;
}

export function partnerOnboardingWizardStepKeyForToken(token: string): string {
  return storageKeyForToken(token);
}

export function partnerOnboardingWizardStepKeyForNetwork(networkId: string): string {
  return storageKeyForNetwork(networkId);
}

export function partnerOnboardingStep1DraftKeyForToken(token: string): string {
  return draftStorageKeyForToken(token);
}

function readStored(raw: string | null): StoredWizardStep | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredWizardStep;
    if (parsed.step !== 1 && parsed.step !== 2 && parsed.step !== 3 && parsed.step !== 4) return null;
    return normalizeStoredStep(parsed);
  } catch {
    const legacy = Number(raw);
    if (legacy === 1 || legacy === 2 || legacy === 3 || legacy === 4) {
      return normalizeStoredStep({ step: legacy as PartnerOnboardingWizardStep, updatedAt: 0 });
    }
    return null;
  }
}

export function readPartnerOnboardingWizardStepForToken(token: string): PartnerOnboardingWizardStep | null {
  return readStored(localStorage.getItem(storageKeyForToken(token)))?.step ?? null;
}

export function readPartnerOnboardingWizardStepForNetwork(
  networkId: string,
): PartnerOnboardingWizardStep | null {
  return readStored(localStorage.getItem(storageKeyForNetwork(networkId)))?.step ?? null;
}

export function savePartnerOnboardingWizardStep(
  step: PartnerOnboardingWizardStep,
  refs: { token?: string | null; networkId?: string | null },
): void {
  const payload: StoredWizardStep = { step, updatedAt: Date.now(), wizardSchema: WIZARD_SCHEMA_VERSION };
  if (refs.networkId) payload.networkId = refs.networkId;
  if (refs.token) payload.token = refs.token;
  const serialized = JSON.stringify(payload);
  if (refs.token) {
    localStorage.setItem(storageKeyForToken(refs.token), serialized);
  }
  if (refs.networkId) {
    localStorage.setItem(storageKeyForNetwork(refs.networkId), serialized);
  }
}

export function readPartnerOnboardingStep1Draft(token: string): PartnerOnboardingStep1Draft | null {
  const raw = localStorage.getItem(draftStorageKeyForToken(token));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PartnerOnboardingStep1Draft>;
    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.cpfDisplay !== 'string' ||
      typeof parsed.phoneDisplay !== 'string'
    ) {
      return null;
    }
    return {
      name: parsed.name,
      email: parsed.email,
      cpfDisplay: parsed.cpfDisplay,
      phoneDisplay: parsed.phoneDisplay,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function savePartnerOnboardingStep1Draft(
  token: string,
  draft: Omit<PartnerOnboardingStep1Draft, 'updatedAt'>,
): void {
  const payload: PartnerOnboardingStep1Draft = { ...draft, updatedAt: Date.now() };
  localStorage.setItem(draftStorageKeyForToken(token), JSON.stringify(payload));
}

export function clearPartnerOnboardingStep1Draft(token: string): void {
  localStorage.removeItem(draftStorageKeyForToken(token));
}

export function clearPartnerOnboardingWizardProgress(refs?: {
  token?: string | null;
  networkId?: string | null;
}): void {
  if (refs?.token) {
    localStorage.removeItem(storageKeyForToken(refs.token));
    clearPartnerOnboardingStep1Draft(refs.token);
  }
  if (refs?.networkId) {
    localStorage.removeItem(storageKeyForNetwork(refs.networkId));
  }
}

export function isPartnerOnboardingInviteUsedMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const norm = message.toLowerCase();
  return norm.includes('já foi utilizado') || norm.includes('ja foi utilizado');
}

/** Convite inexistente, expirado ou inválido — progresso local não se aplica. */
export function isPartnerOnboardingInviteFatalMessage(message: string | null | undefined): boolean {
  if (!message || isPartnerOnboardingInviteUsedMessage(message)) return false;
  const norm = message.toLowerCase();
  return (
    norm.includes('inválido') ||
    norm.includes('invalido') ||
    norm.includes('expirou') ||
    norm.includes('expirado') ||
    norm.includes('não encontrado') ||
    norm.includes('nao encontrado')
  );
}

export type ResolvePartnerOnboardingStepInput = {
  sessionActive: boolean;
  networkId: string | null;
  token: string | null;
  previewNetworkId: string | null;
  previewPending: boolean;
};

/**
 * Regras de retomada do wizard (passos 1–3).
 *
 * 1. Sessão ativa + wizard não concluído: nunca volta ao passo 1; restaura o maior entre 2 (termos) e o passo salvo
 *    (por networkId, senão por token).
 * 2. Sem sessão + preview válido: passo 1 (cadastro); passo salvo só conta se ainda for 1.
 * 3. Sem sessão + convite já usado: permanece no passo 1 com UI de login (passos 2–3 exigem JWT).
 * 4. Wizard marcado como done: redirect na página (fora desta função).
 */
export function resolvePartnerOnboardingWizardStep(
  input: ResolvePartnerOnboardingStepInput,
): PartnerOnboardingWizardStep | null {
  const { sessionActive, networkId, token, previewNetworkId, previewPending } = input;

  if (previewPending) return null;

  const byNetwork = networkId ? readPartnerOnboardingWizardStepForNetwork(networkId) : null;
  const byToken = token ? readPartnerOnboardingWizardStepForToken(token) : null;

  if (sessionActive) {
    const saved = byNetwork ?? byToken ?? 2;
    return clampWizardStep(Math.max(2, saved));
  }

  if (previewNetworkId) {
    const saved = byToken;
    if (saved === 1) return 1;
    return 1;
  }

  if (token && byToken && byToken >= 2) {
    return 1;
  }

  // Convite sem sessão: passos 2+ exigem JWT (termos em diante).

  return 1;
}

export function isPartnerOnboardingWizardDone(): boolean {
  return localStorage.getItem(PARTNER_ONBOARDING_WIZARD_DONE_KEY) === '1';
}

export function markPartnerOnboardingWizardDone(refs?: {
  token?: string | null;
  networkId?: string | null;
}): void {
  localStorage.setItem(PARTNER_ONBOARDING_WIZARD_DONE_KEY, '1');
  clearPartnerOnboardingWizardProgress(refs);
}

export function clearPartnerOnboardingWizardDone(): void {
  localStorage.removeItem(PARTNER_ONBOARDING_WIZARD_DONE_KEY);
}
