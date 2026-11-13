import {
  apiUrl,
  parseApiError,
  parseApiErrorPayload,
  PARTNER_ONBOARDING_CPF_EXISTS_CODE,
  PARTNER_ONBOARDING_EMAIL_EXISTS_CODE,
  PARTNER_ONBOARDING_PHONE_EXISTS_CODE,
} from './http';

const TOKEN_KEY = 'connect_partner_token';
const USER_KEY = 'connect_partner_user';

export type PartnerSessionUser = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  active: boolean;
  source?: 'platform' | 'admin';
};

export type PartnerLoginResult = {
  accessToken: string;
  user: PartnerSessionUser;
  unitIds: string[];
};

export function getPartnerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPartnerSession(token: string, user: PartnerSessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getPartnerUser(): PartnerSessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PartnerSessionUser;
  } catch {
    return null;
  }
}

export function clearPartnerSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function partnerLogin(login: string, password: string): Promise<PartnerLoginResult> {
  const res = await fetch(apiUrl('/api/partner/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Usuário ou senha inválidos.'));
  }

  return res.json() as Promise<PartnerLoginResult>;
}

export async function partnerMe(): Promise<{ user: PartnerSessionUser; unitIds: string[] }> {
  const token = getPartnerToken();
  if (!token) throw new Error('Sessão expirada.');

  const res = await fetch(apiUrl('/api/partner/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearPartnerSession();
    throw new Error(await parseApiError(res, 'Sessão expirada.'));
  }

  return res.json() as Promise<{ user: PartnerSessionUser; unitIds: string[] }>;
}

export type PartnerOnboardingPreview = {
  networkId: string;
  networkName: string;
  expiresAt: string;
  inviteKind?: 'onboarding' | 'team';
};

export async function fetchPartnerOnboardingPreview(token: string): Promise<PartnerOnboardingPreview> {
  const res = await fetch(apiUrl(`/api/partner/auth/onboarding/${encodeURIComponent(token)}/preview`));
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Convite inválido ou expirado.'));
  }
  return res.json() as Promise<PartnerOnboardingPreview>;
}

export type PartnerOnboardingCnpjRequestResult = {
  ok: true;
  status: 'check_email' | 'already_configured';
  message: string;
  cooldownSeconds?: number;
  codeTtlSeconds?: number;
};

export type PartnerOnboardingCnpjVerifyResult =
  | { status: 'ok'; token: string; expiresAt: string }
  | { status: 'already_configured'; message: string };

export async function requestPartnerOnboardingCnpjRecovery(
  cnpj: string,
): Promise<PartnerOnboardingCnpjRequestResult> {
  const res = await fetch(apiUrl('/api/partner/auth/onboarding/recover/request'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnpj }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível enviar o código.'));
  }
  return res.json() as Promise<PartnerOnboardingCnpjRequestResult>;
}

export async function verifyPartnerOnboardingCnpjRecovery(
  cnpj: string,
  code: string,
): Promise<PartnerOnboardingCnpjVerifyResult> {
  const res = await fetch(apiUrl('/api/partner/auth/onboarding/recover/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnpj, code }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Código inválido ou expirado.'));
  }
  return res.json() as Promise<PartnerOnboardingCnpjVerifyResult>;
}

export type CompletePartnerOnboardingBody = {
  name: string;
  email: string;
  cpf: string;
  mobilePhone: string;
  password: string;
  confirmUpdateExisting?: boolean;
};

export class PartnerOnboardingCompleteError extends Error {
  readonly code?: string;
  readonly requireExistingPassword?: boolean;

  constructor(message: string, code?: string, requireExistingPassword?: boolean) {
    super(message);
    this.name = 'PartnerOnboardingCompleteError';
    this.code = code;
    this.requireExistingPassword = requireExistingPassword;
  }
}

export function isPartnerOnboardingEmailExistsError(err: unknown): boolean {
  return (
    err instanceof PartnerOnboardingCompleteError &&
    err.code === PARTNER_ONBOARDING_EMAIL_EXISTS_CODE
  );
}

export function isPartnerOnboardingPhoneExistsError(err: unknown): boolean {
  return (
    err instanceof PartnerOnboardingCompleteError &&
    err.code === PARTNER_ONBOARDING_PHONE_EXISTS_CODE
  );
}

export function isPartnerOnboardingCpfExistsError(err: unknown): boolean {
  return (
    err instanceof PartnerOnboardingCompleteError &&
    err.code === PARTNER_ONBOARDING_CPF_EXISTS_CODE
  );
}

export function isPartnerOnboardingReuseConfirmError(err: unknown): boolean {
  return (
    isPartnerOnboardingEmailExistsError(err) ||
    isPartnerOnboardingPhoneExistsError(err) ||
    isPartnerOnboardingCpfExistsError(err)
  );
}

export async function completePartnerOnboarding(
  token: string,
  body: CompletePartnerOnboardingBody,
): Promise<PartnerLoginResult> {
  const res = await fetch(apiUrl(`/api/partner/auth/onboarding/${encodeURIComponent(token)}/complete`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await parseApiErrorPayload(res, 'Não foi possível concluir o cadastro.');
    throw new PartnerOnboardingCompleteError(
      payload.message,
      payload.code,
      payload.requireExistingPassword,
    );
  }
  return res.json() as Promise<PartnerLoginResult>;
}

export async function partnerRequestLoginOtp(mobilePhone: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(apiUrl('/api/partner/auth/otp/request'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobilePhone }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível enviar o código.'));
  }
  return res.json() as Promise<{ ok: boolean; message: string }>;
}

export type PartnerOnboardingLegalTerms = {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  version: number;
  publishedAt: string;
  effectiveAt: string | null;
};

export type PartnerTermsAcceptanceStatus = {
  slug: string;
  required: boolean;
  accepted: boolean;
  currentVersion: number | null;
  acceptedVersion: number | null;
  documentId: string | null;
};

export async function fetchPartnerOnboardingLegalTerms(): Promise<PartnerOnboardingLegalTerms> {
  const res = await fetch(apiUrl('/api/partner/legal-terms/onboarding'));
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível carregar os termos.'));
  }
  return res.json() as Promise<PartnerOnboardingLegalTerms>;
}

/** Minuta personalizada (rede, unidade, taxas) — exige sessão do onboarding. */
export async function fetchPartnerOnboardingRenderedLegalTerms(): Promise<PartnerOnboardingLegalTerms> {
  const token = getPartnerToken();
  if (!token) throw new Error('Sessão expirada.');

  const res = await fetch(apiUrl('/api/partner/legal-terms/onboarding/render'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível carregar a minuta.'));
  }
  return res.json() as Promise<PartnerOnboardingLegalTerms>;
}

export type PartnerOnboardingTermsAcceptPayload = {
  signedName: string;
  signedDocument: string;
  signatureImageBase64?: string | null;
};

export async function fetchPartnerOnboardingTermsAcceptance(): Promise<PartnerTermsAcceptanceStatus> {
  const token = getPartnerToken();
  if (!token) throw new Error('Sessão expirada.');

  const res = await fetch(apiUrl('/api/partner/legal-terms/onboarding/acceptance'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível verificar o aceite.'));
  }
  return res.json() as Promise<PartnerTermsAcceptanceStatus>;
}

export async function acceptPartnerOnboardingTerms(
  payload: PartnerOnboardingTermsAcceptPayload,
): Promise<PartnerTermsAcceptanceStatus> {
  const token = getPartnerToken();
  if (!token) throw new Error('Sessão expirada.');

  const res = await fetch(apiUrl('/api/partner/legal-terms/onboarding/accept'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível registrar o aceite.'));
  }
  return res.json() as Promise<PartnerTermsAcceptanceStatus>;
}

export async function partnerLoginWithOtp(mobilePhone: string, code: string): Promise<PartnerLoginResult> {
  const res = await fetch(apiUrl('/api/partner/auth/otp/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobilePhone, code }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Código inválido ou expirado.'));
  }
  return res.json() as Promise<PartnerLoginResult>;
}
