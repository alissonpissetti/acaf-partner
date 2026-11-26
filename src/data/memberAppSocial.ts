import type { NetworkSocialContacts } from '../types';

const profileKeys = ['website', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin'] as const;

export function hasProfileSocialLinks(social: NetworkSocialContacts | null | undefined): boolean {
  if (!social) return false;
  return profileKeys.some((k) => social[k]?.trim());
}

export function normalizeSocialUrl(kind: string, raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  switch (kind) {
    case 'website':
      return value.includes('.') ? `https://${value}` : value;
    case 'instagram': {
      const handle = value.replace(/^@/, '');
      if (handle.includes('instagram.com')) return `https://${handle}`;
      return `https://instagram.com/${handle}`;
    }
    case 'facebook':
      if (value.includes('facebook.com')) return value.startsWith('http') ? value : `https://${value}`;
      return `https://facebook.com/${value}`;
    case 'tiktok': {
      const handle = value.replace(/^@/, '');
      return handle.includes('tiktok.com') ? `https://${handle}` : `https://tiktok.com/@${handle}`;
    }
    case 'youtube':
      if (value.includes('youtube.com') || value.includes('youtu.be')) {
        return value.startsWith('http') ? value : `https://${value}`;
      }
      return `https://youtube.com/${value}`;
    case 'linkedin':
      if (value.includes('linkedin.com')) return value.startsWith('http') ? value : `https://${value}`;
      return `https://linkedin.com/in/${value}`;
    default:
      return value;
  }
}

export type MemberAppSocialItem = { kind: string; label: string; url: string };

export function memberAppSocialItems(
  social: NetworkSocialContacts,
  includeWhatsApp = false,
): MemberAppSocialItem[] {
  const defs: { kind: string; label: string }[] = [
    { kind: 'website', label: 'Site' },
    { kind: 'instagram', label: 'Instagram' },
    { kind: 'facebook', label: 'Facebook' },
    ...(includeWhatsApp ? [{ kind: 'whatsapp', label: 'WhatsApp' }] : []),
    { kind: 'tiktok', label: 'TikTok' },
    { kind: 'youtube', label: 'YouTube' },
    { kind: 'linkedin', label: 'LinkedIn' },
  ];

  const out: MemberAppSocialItem[] = [];
  for (const { kind, label } of defs) {
    const raw = social[kind as keyof NetworkSocialContacts] ?? '';
    const url = kind === 'whatsapp' ? '' : normalizeSocialUrl(kind, raw);
    if (kind === 'whatsapp' && raw.trim()) {
      const digits = raw.replace(/\D/g, '');
      if (digits) out.push({ kind, label, url: `https://wa.me/${digits}` });
      continue;
    }
    if (url) out.push({ kind, label, url });
  }
  return out;
}

/** Espaço entre ícones na fileira (alinha ao app). */
export const memberAppSocialIconGapPx = 12;

export const memberAppSocialIconSizePx = 42;

export function memberAppSocialIconSize(_itemCount = 0): number {
  return memberAppSocialIconSizePx;
}

/** Tamanho base do rótulo (px); reduz com scale-down no CSS se precisar. */
export const memberAppSocialLabelFontSizePx = 8.5;

export function memberAppSocialLabelFontSize(_iconSize = memberAppSocialIconSizePx): number {
  return memberAppSocialLabelFontSizePx;
}