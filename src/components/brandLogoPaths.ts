/**
 * PNG extraídos do manual `movly-by-acaf.app.pdf` (p. 3 — variações principais).
 * Ficheiros em `public/branding/`.
 */
export type BrandLogoVariant =
  | 'lime'
  | 'purple'
  | 'white'
  | 'gradient'
  | 'black'
  /** Wordmark “movly.” só em roxo (#8254E4) — vetor do manual, sobre fundo claro */
  | 'wordmarkPurple';

export const BRAND_LOGO_NATURAL: Record<BrandLogoVariant, { w: number; h: number }> = {
  lime: { w: 791, h: 386 },
  purple: { w: 813, h: 414 },
  white: { w: 791, h: 386 },
  gradient: { w: 791, h: 387 },
  black: { w: 791, h: 386 },
  /** viewBox do `movly-logo-purple.svg`: 127.02 × 36.45 */
  wordmarkPurple: { w: 12702, h: 3645 },
};

export const BRAND_LOGO_SRC: Record<BrandLogoVariant, string> = {
  lime: '/branding/movly-logo-lime-on-purple.png',
  purple: '/branding/movly-logo-purple-on-lime.png',
  white: '/branding/movly-logo-lime-on-purple.png',
  gradient: '/branding/movly-logo-lime-on-gradient.png',
  black: '/branding/movly-logo-purple-on-lime.png',
  wordmarkPurple: '/branding/movly-logo-purple.svg',
};

export function brandLogoDimensions(
  variant: BrandLogoVariant,
  height: number,
): { width: number; height: number } {
  const { w, h } = BRAND_LOGO_NATURAL[variant];
  return { width: Math.round((height * w) / h), height };
}
