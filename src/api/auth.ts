import { apiUrl, parseApiError } from './http';

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

export async function completePartnerOnboarding(
  token: string,
  body: { name: string; email: string; cpf: string; mobilePhone: string; password: string },
): Promise<PartnerLoginResult> {
  const res = await fetch(apiUrl(`/api/partner/auth/onboarding/${encodeURIComponent(token)}/complete`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Não foi possível concluir o cadastro.'));
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
