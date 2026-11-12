import type { NetworkSocialContacts } from '../types';

export const NETWORK_SOCIAL_FIELD_DEFS: {
  key: keyof NetworkSocialContacts;
  label: string;
  placeholder: string;
}[] = [
  { key: 'website', label: 'Site', placeholder: 'https://academia.com.br' },
  { key: 'instagram', label: 'Instagram', placeholder: '@academia ou URL' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/academia' },
  { key: 'whatsapp', label: 'Celular (mensagens)', placeholder: '(41) 99999-9999' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@academia' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@academia' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/academia' },
];

export function emptyNetworkSocialContacts(): NetworkSocialContacts {
  return {
    website: '',
    instagram: '',
    facebook: '',
    whatsapp: '',
    tiktok: '',
    youtube: '',
    linkedin: '',
  };
}
