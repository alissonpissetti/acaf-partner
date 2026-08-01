import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  activeUnit,
  apiHealth,
  fetchBootstrap,
  fetchPortal,
  patchActiveUnit,
  patchUnit,
  createUnit,
  type CreateUnitInput,
  type PortalPayload,
} from './api/client';
import type { ConnectPlanId, GymStudent, GymUnit, PortalViewState, UnitPlanSpec, UnitScope } from './types';
import { CONNECT_PLANS } from './types';
import { gymNetFromGross, monthlyGymRepasseForStudentPlan } from './data/acafFees';
import { patchUnitModalities } from './data/unitModalities';
import { channelLabel, tierLabel } from './data/helpers';
import { isAllUnitsScope } from './data/unitScope';
import { validatePasswordLogin, validatePhoneTokenLogin } from './data/mockAuth';
import {
  bootstrapFromLegacyPortal,
  buildPortalPayload,
  mergeBootstrapUnit,
  type PortalBootstrap,
} from './data/buildPortalView';

type PortalContextValue = {
  state: PortalViewState;
  unit: GymUnit;
  loading: boolean;
  error: string | null;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  loginWithPhoneToken: (phone: string, token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  selectUnit: (unitId: string) => Promise<void>;
  setUnitScope: (scope: UnitScope) => void;
  isAllUnits: boolean;
  updateUnit: (patch: Partial<GymUnit>) => void;
  updatePlanSpec: (connectPlanId: ConnectPlanId, patch: Partial<UnitPlanSpec>) => void;
  toggleModality: (modality: string) => void;
  saveUnit: () => Promise<void>;
  createUnit: (input: CreateUnitInput) => Promise<GymUnit>;
  applyPortal: (portal: PortalPayload) => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

const LOGIN_KEY = 'acaf_gym_portal_logged_in';
const UNIT_SCOPE_KEY = 'acaf_gym_unit_scope';

function readUnitScope(): UnitScope {
  return localStorage.getItem(UNIT_SCOPE_KEY) === 'all' ? 'all' : 'single';
}

function portalToView(portal: PortalPayload, apiOnline: boolean): PortalViewState {
  return {
    loggedIn: portal.loggedIn,
    apiOnline,
    networkId: portal.networkId,
    networkName: portal.networkName,
    activeUnitId: portal.activeUnitId,
    unitScope: portal.unitScope ?? readUnitScope(),
    units: portal.units,
    students: portal.students,
    payout: portal.payout,
    payoutsByUnit: portal.payoutsByUnit ?? {},
    payoutHistoryByUnit: portal.payoutHistoryByUnit ?? {},
    checkInLog: portal.checkInLog,
  };
}

async function loadBootstrapData(): Promise<PortalBootstrap> {
  try {
    return await fetchBootstrap();
  } catch {
    const single = await fetchPortal('single');
    let all = single;
    try {
      all = await fetchPortal('all');
    } catch {
      /* API legada pode não aceitar scope=all */
    }
    const payoutsByUnit =
      all.payoutsByUnit ?? single.payoutsByUnit ?? { [single.activeUnitId]: single.payout };
    return {
      networkId: all.networkId,
      networkName: all.networkName,
      activeUnitId: single.activeUnitId,
      units: all.units.length ? all.units : single.units,
      students: all.students.length >= single.students.length ? all.students : single.students,
      payoutsByUnit,
      payoutHistoryByUnit:
        all.payoutHistoryByUnit ??
        single.payoutHistoryByUnit ??
        Object.fromEntries(Object.entries(payoutsByUnit).map(([id, p]) => [id, [p]])),
      checkInLog: all.checkInLog.length >= single.checkInLog.length ? all.checkInLog : single.checkInLog,
    };
  }
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortalViewState | null>(null);
  const [draftUnit, setDraftUnit] = useState<GymUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrapRef = useRef<PortalBootstrap | null>(null);

  const applyPortal = useCallback((portal: PortalPayload) => {
    setState((prev) => portalToView(portal, prev?.apiOnline ?? true));
    setDraftUnit(activeUnit(portal));
  }, []);

  const applyScopeFromBootstrap = useCallback(
    (scope: UnitScope) => {
      const boot = bootstrapRef.current;
      if (!boot) return;
      applyPortal(buildPortalPayload(boot, scope));
    },
    [applyPortal],
  );

  const refresh = useCallback(async () => {
    const online = await apiHealth();
    if (!online) {
      setError('Não foi possível carregar os dados. Tente recarregar a página.');
      const scope = readUnitScope();
      const boot = bootstrapRef.current;
      setState((prev) => {
        if (boot && prev) {
          return { ...portalToView(buildPortalPayload(boot, scope), false), loggedIn: prev.loggedIn };
        }
        if (prev) {
          return { ...prev, apiOnline: false, unitScope: scope };
        }
        return {
              loggedIn: false,
              apiOnline: false,
              networkId: '',
              networkName: '',
              activeUnitId: '',
              unitScope: 'single',
              units: [],
              students: [],
              payout: {
                monthLabel: '',
                dailyPassGross: 0,
                dailyPassNet: 0,
                connectRepasseTotal: 0,
                totalNet: 0,
                status: 'open',
                connectLines: [],
                recentDailySales: [],
              },
              checkInLog: [],
              payoutsByUnit: {},
              payoutHistoryByUnit: {},
            };
      });
      return;
    }
    setError(null);
    const boot = await loadBootstrapData();
    bootstrapRef.current = boot;
    const scope = readUnitScope();
    applyPortal(buildPortalPayload(boot, scope));
  }, [applyPortal]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const completeLogin = useCallback(async () => {
    localStorage.setItem(LOGIN_KEY, '1');
    await refresh();
    setState((prev) => (prev ? { ...prev, loggedIn: true } : prev));
  }, [refresh]);

  const loginWithPassword = useCallback(
    async (username: string, password: string) => {
      const err = validatePasswordLogin(username, password);
      if (err) throw new Error(err);
      await completeLogin();
    },
    [completeLogin],
  );

  const loginWithPhoneToken = useCallback(
    async (phone: string, token: string) => {
      const err = validatePhoneTokenLogin(phone, token);
      if (err) throw new Error(err);
      await completeLogin();
    },
    [completeLogin],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(LOGIN_KEY);
    bootstrapRef.current = null;
    setState((prev) => (prev ? { ...prev, loggedIn: false } : prev));
  }, []);

  useEffect(() => {
    if (localStorage.getItem(LOGIN_KEY) === '1' && state && !state.loggedIn) {
      setState({ ...state, loggedIn: true });
    }
  }, [state]);

  const selectUnit = useCallback(
    async (unitId: string) => {
      await patchActiveUnit(unitId);
      const boot = bootstrapRef.current;
      if (boot) {
        bootstrapRef.current = { ...boot, activeUnitId: unitId };
        applyScopeFromBootstrap(readUnitScope());
        return;
      }
      await refresh();
    },
    [applyScopeFromBootstrap, refresh],
  );

  const setUnitScope = useCallback(
    (scope: UnitScope) => {
      localStorage.setItem(UNIT_SCOPE_KEY, scope);
      const boot = bootstrapRef.current;
      if (boot) {
        applyPortal(buildPortalPayload(boot, scope));
        return;
      }
      setState((prev) => (prev ? { ...prev, unitScope: scope } : prev));
      void refresh();
    },
    [applyPortal, refresh],
  );

  const updateUnit = useCallback((patch: Partial<GymUnit>) => {
    setDraftUnit((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updatePlanSpec = useCallback(
    (connectPlanId: ConnectPlanId, patch: Partial<UnitPlanSpec>) => {
      setDraftUnit((prev) => {
        if (!prev) return prev;
        const planSpecs = prev.planSpecs.map((s) =>
          s.connectPlanId === connectPlanId ? { ...s, ...patch } : s,
        );
        return { ...prev, planSpecs };
      });
    },
    [],
  );

  const toggleModality = useCallback((modality: string) => {
    setDraftUnit((prev) => {
      if (!prev) return prev;
      const mods = prev.modalities;
      const next = mods.includes(modality) ? mods.filter((m) => m !== modality) : [...mods, modality];
      return { ...prev, ...patchUnitModalities(prev, next) };
    });
  }, []);

  const saveUnit = useCallback(async () => {
    if (!draftUnit || !state) return;
    const scope = state.unitScope;
    const portal = await patchUnit(draftUnit.id, draftUnit, scope);
    if (bootstrapRef.current) {
      bootstrapRef.current = mergeBootstrapUnit(bootstrapRef.current, draftUnit);
    }
    applyPortal(
      portal.unitScope
        ? portal
        : buildPortalPayload(bootstrapRef.current ?? bootstrapFromLegacyPortal(portal), scope),
    );
    await refresh();
  }, [draftUnit, state, applyPortal, refresh]);

  const createUnitHandler = useCallback(
    async (input: CreateUnitInput) => {
      const scope = state?.unitScope ?? readUnitScope();
      const portal = await createUnit(input, scope);
      const created =
        portal.units.find((u) => u.id === portal.activeUnitId) ??
        portal.units[portal.units.length - 1]!;
      if (bootstrapRef.current) {
        bootstrapRef.current = {
          ...bootstrapRef.current,
          activeUnitId: portal.activeUnitId,
          units: portal.units,
          payoutsByUnit: portal.payoutsByUnit,
          payoutHistoryByUnit: portal.payoutHistoryByUnit ?? bootstrapRef.current.payoutHistoryByUnit,
        };
      }
      applyPortal(portal.unitScope ? portal : buildPortalPayload(bootstrapRef.current!, scope));
      return created;
    },
    [applyPortal, state?.unitScope],
  );

  const unit = draftUnit ?? state?.units.find((u) => u.id === state.activeUnitId) ?? state?.units[0]!;
  const isAllUnits = state?.unitScope === 'all';

  const value = useMemo(
    (): PortalContextValue | null =>
      state
        ? {
            state: { ...state, loggedIn: state.loggedIn || localStorage.getItem(LOGIN_KEY) === '1' },
            unit,
            loading,
            error,
            loginWithPassword,
            loginWithPhoneToken,
            logout,
            refresh,
            selectUnit,
            setUnitScope,
            isAllUnits,
            updateUnit,
            updatePlanSpec,
            toggleModality,
            saveUnit,
            createUnit: createUnitHandler,
            applyPortal,
          }
        : null,
    [
      state,
      unit,
      loading,
      error,
      loginWithPassword,
      loginWithPhoneToken,
      logout,
      refresh,
      selectUnit,
      setUnitScope,
      isAllUnits,
      updateUnit,
      updatePlanSpec,
      toggleModality,
      saveUnit,
      createUnitHandler,
      applyPortal,
    ],
  );

  if (!value) {
    return <div style={{ padding: 24 }}>Carregando portal…</div>;
  }

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}

export function dailyNet(gross: number): number {
  return gymNetFromGross(gross);
}

export { channelLabel, tierLabel, monthlyGymRepasseForStudentPlan };

export function mergePlanSpecs(saved: UnitPlanSpec[] | undefined): UnitPlanSpec[] {
  return CONNECT_PLANS.map((p, i) => {
    const found = saved?.find((s) => s.connectPlanId === p.id);
    return (
      found ?? {
        connectPlanId: p.id,
        enabled: i <= 3,
        includedModalities: [],
        exactOnly: false,
      }
    );
  });
}

export function filterStudents(
  students: GymStudent[],
  query: string,
  channel: 'all' | GymStudent['channel'],
): GymStudent[] {
  const q = query.trim().toLowerCase();
  return students.filter((s) => {
    if (channel !== 'all' && s.channel !== channel) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });
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
    unitScope: state.unitScope,
    unitCount: state.units.length,
    dailyPassPrice: isAllUnitsScope(state.unitScope) ? null : unit.dailyPassPrice,
    enabledTiers: isAllUnitsScope(state.unitScope)
      ? null
      : unit.planSpecs.filter((p) => p.enabled).length,
    apiOnline: state.apiOnline,
  };
}
