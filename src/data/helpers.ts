import type { ConnectPlanId } from '../types';
import { CONNECT_PLANS } from '../types';

export function channelLabel(channel: 'daily_pass' | 'connect_primary' | 'connect_visitor'): string {
  switch (channel) {
    case 'daily_pass':
      return 'Diária pelo app';
    case 'connect_primary':
      return 'ACAF · academia principal';
    case 'connect_visitor':
      return 'ACAF · visitante';
    default:
      return channel;
  }
}

export function tierLabel(id: ConnectPlanId): string {
  return CONNECT_PLANS.find((p) => p.id === id)?.name ?? id;
}

export async function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function checkInTypeLabel(type: 'daily_pass' | 'connect_member' | 'connect_visitor'): string {
  switch (type) {
    case 'daily_pass':
      return 'Diária';
    case 'connect_member':
      return 'Connect · principal';
    case 'connect_visitor':
      return 'Connect · visitante';
  }
}
