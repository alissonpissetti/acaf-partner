import { API_URL } from '../config';

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_URL ? `${API_URL}${normalized}` : normalized;
}

export type ApiErrorPayload = {
  message: string;
  code?: string;
  requireExistingPassword?: boolean;
};

function normalizeApiMessage(message: unknown): string | null {
  if (Array.isArray(message)) {
    const joined = message.map(String).join(', ').trim();
    return joined || null;
  }
  if (typeof message === 'string' && message.trim()) return message.trim();
  if (message && typeof message === 'object') {
    const nested = message as { message?: unknown; code?: string };
    if (typeof nested.message === 'string' && nested.message.trim()) {
      return nested.message.trim();
    }
  }
  return null;
}

export async function parseApiErrorPayload(
  response: Response,
  fallback: string,
): Promise<ApiErrorPayload> {
  try {
    const err = (await response.json()) as { message?: unknown; code?: string };
    const message = normalizeApiMessage(err.message) ?? fallback;
    if (typeof err.code === 'string' && err.code.trim()) {
      return { message, code: err.code.trim() };
    }
    if (err.message && typeof err.message === 'object') {
      const nested = err.message as {
        code?: string;
        requireExistingPassword?: boolean;
      };
      const code =
        typeof nested.code === 'string' && nested.code.trim() ? nested.code.trim() : undefined;
      const requireExistingPassword =
        nested.requireExistingPassword === true ? true : undefined;
      if (code || requireExistingPassword) {
        return { message, code, requireExistingPassword };
      }
    }
    return { message };
  } catch {
    return { message: fallback };
  }
}

export async function parseApiError(response: Response, fallback: string): Promise<string> {
  const payload = await parseApiErrorPayload(response, fallback);
  return payload.message;
}

export const PARTNER_ONBOARDING_EMAIL_EXISTS_CODE = 'PARTNER_ONBOARDING_EMAIL_EXISTS';
export const PARTNER_ONBOARDING_PHONE_EXISTS_CODE = 'PARTNER_ONBOARDING_PHONE_EXISTS';
export const PARTNER_ONBOARDING_CPF_EXISTS_CODE = 'PARTNER_ONBOARDING_CPF_EXISTS';
