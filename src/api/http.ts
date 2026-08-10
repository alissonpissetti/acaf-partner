import { API_URL } from '../config';

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_URL ? `${API_URL}${normalized}` : normalized;
}

export async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const err = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(err.message)) return err.message.join(', ');
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
  } catch {
    /* ignore */
  }
  return fallback;
}
