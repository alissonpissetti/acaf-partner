export type PartnerOnboardingWizardStep = 1 | 2 | 3;

export const PARTNER_ONBOARDING_WIZARD_DONE_KEY = 'connect_partner_onboarding_wizard_done';

const WIZARD_STEP_KEY_PREFIX = 'connect_partner_onboarding_wizard_step';

export const ONBOARDING_WIZARD_STEPS: { step: PartnerOnboardingWizardStep; label: string }[] = [
  { step: 1, label: 'Seu acesso' },
  { step: 2, label: 'Dados da rede' },
  { step: 3, label: 'Unidades' },
];

type StoredWizardStep = {
  step: PartnerOnboardingWizardStep;
  updatedAt: number;
  networkId?: string;
  token?: string;
};

function clampWizardStep(value: number): PartnerOnboardingWizardStep {
  if (value <= 1) return 1;
  if (value >= 3) return 3;
  return 2;
}

function storageKeyForToken(token: string): string {
  return `${WIZARD_STEP_KEY_PREFIX}:token:${token}`;
}

function storageKeyForNetwork(networkId: string): string {
  return `${WIZARD_STEP_KEY_PREFIX}:network:${networkId}`;
}

function readStored(raw: string | null): StoredWizardStep | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredWizardStep;
    if (parsed.step !== 1 && parsed.step !== 2 && parsed.step !== 3) return null;
    return parsed;
  } catch {
    const legacy = Number(raw);
    if (legacy === 1 || legacy === 2 || legacy === 3) {
      return { step: legacy, updatedAt: 0 };
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
  const payload: StoredWizardStep = { step, updatedAt: Date.now() };
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

export function clearPartnerOnboardingWizardProgress(refs?: {
  token?: string | null;
  networkId?: string | null;
}): void {
  if (refs?.token) {
    localStorage.removeItem(storageKeyForToken(refs.token));
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
 * 1. Sessão ativa + wizard não concluído: nunca volta ao passo 1; restaura o maior entre 2 e o passo salvo
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
