import { ACAF_DAILY_FEE_PERCENT } from './types';
import { usePortal } from './portalContext';

export function dailyNet(gross: number): number {
  return gross * (1 - ACAF_DAILY_FEE_PERCENT / 100);
}

export function useDashboardStats() {
  const { state, unit } = usePortal();
  const { students, payout } = state;

  const primaryMembers = students.filter((s) => s.channel === 'connect_primary');
  const dailyBuyers = students.filter((s) => s.channel === 'daily_pass');
  const checkInsMonth = students.reduce((a, s) => a + s.checkInsThisMonth, 0);

  return {
    unit,
    networkName: state.networkName,
    primaryMembers: primaryMembers.length,
    dailyBuyers: dailyBuyers.length,
    checkInsMonth,
    receptionToday: state.checkInLog.filter((c) => {
      const d = new Date(c.validatedAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    payoutPreview: payout.totalNet,
    dailyPassPrice: unit.dailyPassPrice,
    enabledTiers: unit.planSpecs.filter((p) => p.enabled).length,
    apiOnline: state.apiOnline,
  };
}

export function filterStudents(
  students: import('./types').GymStudent[],
  query: string,
  channel: 'all' | import('./types').GymStudent['channel'],
) {
  const q = query.trim().toLowerCase();
  return students.filter((s) => {
    if (channel !== 'all' && s.channel !== channel) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });
}
