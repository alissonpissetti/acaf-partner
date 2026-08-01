import type { PortalPayload } from '../api/client';
import type { CheckInLogEntry, GymStudent, MonthlyPayout, UnitScope } from '../types';
import { aggregatePayouts } from './aggregatePayout';

export type PortalBootstrap = {
  networkId: string;
  networkName: string;
  activeUnitId: string;
  units: PortalPayload['units'];
  students: GymStudent[];
  payoutsByUnit: Record<string, MonthlyPayout>;
  payoutHistoryByUnit: Record<string, MonthlyPayout[]>;
  checkInLog: CheckInLogEntry[];
};

export function buildPortalPayload(bootstrap: PortalBootstrap, unitScope: UnitScope): PortalPayload {
  const { payoutsByUnit, payoutHistoryByUnit } = bootstrap;
  const history = payoutHistoryByUnit ?? {};

  if (unitScope === 'all') {
    return {
      loggedIn: true,
      networkId: bootstrap.networkId,
      networkName: bootstrap.networkName,
      activeUnitId: bootstrap.activeUnitId,
      unitScope: 'all',
      units: bootstrap.units,
      students: bootstrap.students,
      payout: aggregatePayouts(payoutsByUnit),
      payoutsByUnit,
      payoutHistoryByUnit: history,
      checkInLog: [...bootstrap.checkInLog].reverse().slice(0, 80),
    };
  }

  const payout = payoutsByUnit[bootstrap.activeUnitId] ?? aggregatePayouts(payoutsByUnit);
  const students = bootstrap.students.filter((s) => s.unitId === bootstrap.activeUnitId);
  const checkInLog = bootstrap.checkInLog
    .filter((c) => c.unitId === bootstrap.activeUnitId)
    .slice(-50)
    .reverse();

  return {
    loggedIn: true,
    networkId: bootstrap.networkId,
    networkName: bootstrap.networkName,
    activeUnitId: bootstrap.activeUnitId,
    unitScope: 'single',
    units: bootstrap.units,
    students,
    payout,
    payoutsByUnit,
    payoutHistoryByUnit: history,
    checkInLog,
  };
}

/** Converte resposta legada de /api/portal (sem bootstrap) em bootstrap parcial. */
export function bootstrapFromLegacyPortal(portal: PortalPayload): PortalBootstrap {
  const payoutsByUnit = portal.payoutsByUnit ?? { [portal.activeUnitId]: portal.payout };
  const payoutHistoryByUnit =
    portal.payoutHistoryByUnit ??
    Object.fromEntries(
      Object.entries(payoutsByUnit).map(([id, p]) => [id, [p]]),
    );
  return {
    networkId: portal.networkId,
    networkName: portal.networkName,
    activeUnitId: portal.activeUnitId,
    units: portal.units,
    students: portal.students,
    payoutsByUnit,
    payoutHistoryByUnit,
    checkInLog: portal.checkInLog,
  };
}

export function mergeBootstrapUnit(bootstrap: PortalBootstrap, unit: PortalPayload['units'][0]): PortalBootstrap {
  return {
    ...bootstrap,
    units: bootstrap.units.map((u) => (u.id === unit.id ? unit : u)),
  };
}
