import { connectPlanById } from './connectDomain';
import type { ConnectPlanId, GymStudent } from '../types';

export function channelLabel(channel: 'daily_pass' | 'connect_primary'): string {
  switch (channel) {
    case 'daily_pass':
      return 'Diária pelo app';
    case 'connect_primary':
      return 'ACAF · plano mensal';
    default:
      return channel;
  }
}

export function studentCompanyName(student: GymStudent): string {
  return student.companyName?.trim() || '—';
}

export function tierLabel(id: ConnectPlanId): string {
  return connectPlanById(id)?.name ?? id;
}

export async function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function checkInTypeLabel(type: 'daily_pass' | 'connect_member'): string {
  switch (type) {
    case 'daily_pass':
      return 'Diária';
    case 'connect_member':
      return 'Connect · plano mensal';
  }
}
