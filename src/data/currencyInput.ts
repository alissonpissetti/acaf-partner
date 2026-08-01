/** Converte número para exibição parcial no input (sem símbolo R$). */
export function formatBrlInputDigits(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Interpreta texto digitado (com ou sem máscara) como reais. */
export function parseBrlInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function amountFromDigitStream(digits: string): number {
  const n = parseInt(digits.replace(/\D/g, '') || '0', 10);
  return n / 100;
}

export function clampAmount(amount: number, min: number, max: number): number {
  if (!Number.isFinite(amount)) return min;
  return Math.min(max, Math.max(min, Math.round(amount * 100) / 100));
}
