import type { PendingCheckInRequest } from './pendingCheckIn.js';
import { demoMemberCode } from './checkIn.js';
import type {
  ApiStore,
  CheckInLogEntry,
  ConnectPlanId,
  GymStudent,
  GymUnit,
  MonthlyPayout,
  UnitPlanSpec,
} from './types.js';

const FEE = 20;
const net = (g: number) => Math.round(g * 100 * (1 - FEE / 100)) / 100;

function clampDailyStudent(price: number): number {
  return Math.min(59, Math.max(19, price));
}
function dailySaleTotalGross(dailyPrice: number): number {
  return Math.round(clampDailyStudent(dailyPrice) * 100) / 100;
}

const PLAN_PRICE: Record<ConnectPlanId, number> = {
  'connect-start': 39.9,
  'connect-plus': 69.9,
  'connect-multi': 129.9,
  'connect-pro': 189.9,
  'connect-total': 299.9,
};

const BUYER_NAMES = [
  'Pedro Lima',
  'Marina Souza',
  'Ana Costa',
  'João Ferreira',
  'Camila Rocha',
  'Visitante app',
  'Bruno Alves',
  'Juliana Prado',
  'Felipe Nunes',
  'Patricia Dias',
];

function planSpecsDefault(): UnitPlanSpec[] {
  return [
    { connectPlanId: 'connect-start', enabled: true, includedModalities: [], exactOnly: false },
    { connectPlanId: 'connect-plus', enabled: true, includedModalities: [], exactOnly: false },
    { connectPlanId: 'connect-multi', enabled: true, includedModalities: [], exactOnly: false },
    { connectPlanId: 'connect-pro', enabled: true, includedModalities: [], exactOnly: false },
    { connectPlanId: 'connect-total', enabled: false, includedModalities: [], exactOnly: false },
  ];
}

function demoUnits(): GymUnit[] {
  return [
    {
      id: 'g_carpe',
      unitName: 'Unidade Portão',
      neighborhood: 'Portão',
      city: 'Curitiba/PR',
      openHours: 'Seg–Sex 5h30–23h · Sáb 7h–14h',
      description:
        'Unidade de referência na região do Portão. Musculação, natação e aulas coletivas.',
      modalities: [
        'Musculação',
        'Natação',
        'Bike Indoor',
        'Hidroginástica',
        'Boxe',
        'Pilates',
        'Hatha Yoga',
        'Full Body',
        'Funcional',
        'FitDance',
      ],
      dailyPassPrice: 44.9,
      dailyPassActive: true,
      dailyPassNotes: 'Válida no dia da compra até o fechamento da unidade.',
      dailyPassModalities: ['Musculação', 'Funcional', 'Natação', 'Full Body'],
      planSpecs: planSpecsDefault(),
      heroPhotoDataUrl: null,
      galleryPhotoDataUrls: [],
      autoApproveCheckIn: false,
    },
    {
      id: 'g_carpe_batel',
      unitName: 'Unidade Batel',
      neighborhood: 'Batel',
      city: 'Curitiba/PR',
      openHours: 'Seg–Sex 6h–22h · Sáb 8h–12h',
      description: 'Unidade Batel · musculação, pilates e aulas coletivas.',
      modalities: [
        'Musculação',
        'Funcional',
        'Pilates',
        'Bike Indoor',
        'Hatha Yoga',
        'Full Body',
        'FitDance',
      ],
      dailyPassPrice: 47.9,
      dailyPassActive: true,
      dailyPassNotes: 'Diária válida apenas na unidade Batel.',
      dailyPassModalities: ['Musculação', 'Funcional'],
      planSpecs: planSpecsDefault(),
      heroPhotoDataUrl: null,
      galleryPhotoDataUrls: [],
      autoApproveCheckIn: false,
    },
    {
      id: 'g_carpe_centro',
      unitName: 'Unidade Centro',
      neighborhood: 'Centro',
      city: 'Curitiba/PR',
      openHours: 'Seg–Sex 6h–22h',
      description: 'Unidade Centro · musculação, natação e hidroginástica.',
      modalities: ['Musculação', 'Funcional', 'Natação', 'Hidroginástica', 'Boxe'],
      dailyPassPrice: 42.9,
      dailyPassActive: true,
      dailyPassNotes: 'Diária válida na unidade Centro.',
      dailyPassModalities: ['Musculação', 'Funcional', 'Natação'],
      planSpecs: planSpecsDefault(),
      heroPhotoDataUrl: null,
      galleryPhotoDataUrls: [],
      autoApproveCheckIn: false,
    },
  ];
}

type MonthSpec = { key: string; label: string; year: number; month: number; scale: number };

const DEMO_MONTHS: MonthSpec[] = [
  { key: '2026-05', label: 'Maio 2026', year: 2026, month: 5, scale: 0.72 },
  { key: '2026-06', label: 'Junho 2026', year: 2026, month: 6, scale: 0.88 },
  { key: '2026-07', label: 'Julho 2026', year: 2026, month: 7, scale: 1 },
];

type UnitPayoutProfile = {
  unitId: string;
  dailyPrice: number;
  lines: { plan: ConnectPlanId; members: number; checkIns: number }[];
  dailySalesCount: number;
};

const UNIT_PROFILES: UnitPayoutProfile[] = [
  {
    unitId: 'g_carpe',
    dailyPrice: 44.9,
    lines: [
      { plan: 'connect-plus', members: 12, checkIns: 98 },
      { plan: 'connect-multi', members: 8, checkIns: 142 },
      { plan: 'connect-start', members: 3, checkIns: 18 },
    ],
    dailySalesCount: 16,
  },
  {
    unitId: 'g_carpe_batel',
    dailyPrice: 47.9,
    lines: [
      { plan: 'connect-plus', members: 5, checkIns: 44 },
      { plan: 'connect-multi', members: 4, checkIns: 52 },
    ],
    dailySalesCount: 11,
  },
  {
    unitId: 'g_carpe_centro',
    dailyPrice: 42.9,
    lines: [
      { plan: 'connect-plus', members: 3, checkIns: 28 },
      { plan: 'connect-start', members: 2, checkIns: 12 },
    ],
    dailySalesCount: 8,
  },
];

function buildMonthPayout(profile: UnitPayoutProfile, month: MonthSpec): MonthlyPayout {
  const scale = month.scale;
  const connectLines = profile.lines.map((l) => {
    const members = Math.max(1, Math.round(l.members * scale));
    const checkIns = Math.max(members, Math.round(l.checkIns * scale));
    const gross = members * PLAN_PRICE[l.plan];
    return {
      connectPlanId: l.plan,
      activeMembers: members,
      checkIns,
      repasseAmount: net(gross),
    };
  });
  const connectGross = profile.lines.reduce(
    (s, l) => s + Math.max(1, Math.round(l.members * scale)) * PLAN_PRICE[l.plan],
    0,
  );
  const connectRepasseTotal = net(connectGross);
  const salesN = Math.max(3, Math.round(profile.dailySalesCount * scale));
  const dailyPassGross = Math.round(salesN * dailySaleTotalGross(profile.dailyPrice) * 100) / 100;
  const dailyPassNet = net(dailyPassGross);

  const recentDailySales: MonthlyPayout['recentDailySales'] = [];
  for (let i = 0; i < salesN; i++) {
    const day = Math.max(1, 28 - (i % 27));
    const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const totalGross = dailySaleTotalGross(profile.dailyPrice);
    recentDailySales.push({
      id: `${profile.unitId}-${month.key}-d${i}`,
      date,
      studentName: BUYER_NAMES[i % BUYER_NAMES.length]!,
      gross: totalGross,
      feePercent: FEE,
      net: net(totalGross),
    });
  }
  recentDailySales.sort((a, b) => b.date.localeCompare(a.date));

  let status: MonthlyPayout['status'] = 'open';
  if (month.key === '2026-05' || month.key === '2026-06') status = 'paid';

  return {
    monthLabel: month.label,
    dailyPassGross,
    dailyPassNet,
    connectRepasseTotal,
    totalNet: dailyPassNet + connectRepasseTotal,
    status,
    paidAt: status === 'paid' ? `${month.year}-${String(month.month).padStart(2, '0')}-28` : undefined,
    connectLines,
    recentDailySales,
  };
}

export function buildPayoutHistoryByUnit(): Record<string, MonthlyPayout[]> {
  const history: Record<string, MonthlyPayout[]> = {};
  for (const profile of UNIT_PROFILES) {
    history[profile.unitId] = DEMO_MONTHS.map((m) => buildMonthPayout(profile, m));
  }
  return history;
}

export function buildCurrentPayoutsByUnit(
  history: Record<string, MonthlyPayout[]>,
): Record<string, MonthlyPayout> {
  const current: Record<string, MonthlyPayout> = {};
  for (const [unitId, months] of Object.entries(history)) {
    current[unitId] = months[months.length - 1]!;
  }
  return current;
}

function demoStudents(): GymStudent[] {
  return [
    {
      id: 's1',
      unitId: 'g_carpe',
      name: 'Marina Souza',
      email: 'marina.s@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-multi',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 19,
      lastVisit: '2026-07-28',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's2',
      unitId: 'g_carpe',
      name: 'Pedro Lima',
      email: 'pedro.l@email.com',
      channel: 'daily_pass',
      dailyPassPricePaid: 39.9,
      checkInsThisMonth: 5,
      lastVisit: '2026-07-28',
      dailyPassesThisMonth: 5,
    },
    {
      id: 's3',
      unitId: 'g_carpe',
      name: 'Ana Beatriz Costa',
      email: 'ana.c@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-plus',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 14,
      lastVisit: '2026-07-27',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's4',
      unitId: 'g_carpe',
      name: 'Lucas Mendes',
      email: 'lucas.m@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-start',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 3,
      lastVisit: '2026-07-22',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's5',
      unitId: 'g_carpe',
      name: 'Fernanda Oliveira',
      email: 'fe.oliveira@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-plus',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 11,
      lastVisit: '2026-07-26',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's6',
      unitId: 'g_carpe_batel',
      name: 'Rafael Torres',
      email: 'rafa.t@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-plus',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 11,
      lastVisit: '2026-07-27',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's7',
      unitId: 'g_carpe_batel',
      name: 'Camila Rocha',
      email: 'camila.r@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-multi',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 9,
      lastVisit: '2026-07-25',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's8',
      unitId: 'g_carpe_batel',
      name: 'Bruno Alves',
      email: 'bruno.a@email.com',
      channel: 'daily_pass',
      dailyPassPricePaid: 47.9,
      checkInsThisMonth: 2,
      lastVisit: '2026-07-24',
      dailyPassesThisMonth: 2,
    },
    {
      id: 's9',
      unitId: 'g_carpe_centro',
      name: 'Juliana Prado',
      email: 'ju.prado@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-plus',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 8,
      lastVisit: '2026-07-28',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's10',
      unitId: 'g_carpe_centro',
      name: 'Felipe Nunes',
      email: 'felipe.n@email.com',
      channel: 'connect_primary',
      connectPlanId: 'connect-start',
      corporateBenefitPerMonth: 44.9,
      checkInsThisMonth: 6,
      lastVisit: '2026-07-20',
      dailyPassesThisMonth: 0,
    },
    {
      id: 's11',
      unitId: 'g_carpe',
      name: 'Patricia Dias',
      email: 'pat.dias@email.com',
      channel: 'daily_pass',
      dailyPassPricePaid: 19,
      checkInsThisMonth: 1,
      lastVisit: '2026-07-18',
      dailyPassesThisMonth: 1,
    },
    {
      id: 's12',
      unitId: 'g_carpe_centro',
      name: 'João Ferreira',
      email: 'joao.f@email.com',
      channel: 'daily_pass',
      dailyPassPricePaid: 42.9,
      checkInsThisMonth: 2,
      lastVisit: '2026-07-19',
      dailyPassesThisMonth: 2,
    },
  ];
}

function demoCheckInLog(students: GymStudent[]): CheckInLogEntry[] {
  const log: CheckInLogEntry[] = [];
  let seq = 0;

  for (const month of DEMO_MONTHS) {
    for (let d = 2; d <= 26; d += 2) {
      for (const student of students) {
        if (month.key === '2026-05' && student.unitId === 'g_carpe_centro' && seq % 2 === 0) continue;
        const day = Math.min(d + (seq % 4), 28);
        const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const type: CheckInLogEntry['type'] =
          student.channel === 'daily_pass' ? 'daily_pass' : 'connect_member';
        log.push({
          id: `ci-${seq++}`,
          unitId: student.unitId,
          code: `CHK-${seq}`,
          type,
          holderName: student.name,
          validatedAt: `${date}T${String(8 + (seq % 10)).padStart(2, '0')}:${String((seq * 7) % 60).padStart(2, '0')}:00.000Z`,
        });
        if (log.length >= 72) return log.sort((a, b) => b.validatedAt.localeCompare(a.validatedAt));
      }
    }
  }
  return log.sort((a, b) => b.validatedAt.localeCompare(a.validatedAt));
}

function demoTodayCheckIns(students: GymStudent[]): CheckInLogEntry[] {
  const today = '2026-07-28';
  const picks = students.filter((s) => s.unitId === 'g_carpe' || s.unitId === 'g_carpe_batel').slice(0, 6);
  return picks.map((student, i) => {
    const type: CheckInLogEntry['type'] =
      student.channel === 'daily_pass' ? 'daily_pass' : 'connect_member';
    const hour = 7 + i;
    return {
      id: `ci-today-${i}`,
      unitId: student.unitId,
      code: `CHK-TODAY-${i}`,
      type,
      holderName: student.name,
      validatedAt: `${today}T${String(hour).padStart(2, '0')}:${String(12 + i * 5).padStart(2, '0')}:00.000Z`,
    };
  });
}

export function demoPendingCheckIns(): PendingCheckInRequest[] {
  const base = '2026-07-28T';
  return [
    {
      id: 'pend-1',
      unitId: 'g_carpe',
      holderName: 'Felipe Nunes',
      code: demoMemberCode('g_carpe'),
      type: 'connect_member',
      requestedAt: `${base}14:02:00.000Z`,
      status: 'pending',
    },
    {
      id: 'pend-2',
      unitId: 'g_carpe',
      holderName: 'Visitante · diária',
      code: 'ACAF-MCK-DEMO-G_CARPE',
      type: 'daily_pass',
      requestedAt: `${base}14:08:00.000Z`,
      status: 'pending',
    },
    {
      id: 'pend-3',
      unitId: 'g_carpe_batel',
      holderName: 'Camila Rocha',
      code: demoMemberCode('g_carpe_batel'),
      type: 'connect_member',
      requestedAt: `${base}13:55:00.000Z`,
      status: 'pending',
    },
    {
      id: 'pend-4',
      unitId: 'g_carpe_centro',
      holderName: 'João Ferreira',
      code: demoMemberCode('g_carpe_centro'),
      type: 'connect_member',
      requestedAt: `${base}14:11:00.000Z`,
      status: 'pending',
    },
  ];
}

export function buildDemoStore(): ApiStore {
  const payoutHistoryByUnit = buildPayoutHistoryByUnit();
  const payoutsByUnit = buildCurrentPayoutsByUnit(payoutHistoryByUnit);
  const students = demoStudents();
  const checkInLog = [...demoTodayCheckIns(students), ...demoCheckInLog(students)].sort((a, b) =>
    b.validatedAt.localeCompare(a.validatedAt),
  );
  const endOfDay = new Date(2026, 6, 28, 23, 59, 59);

  return {
    networkId: 'net_carpe',
    networkName: 'Carpe Diem Academia',
    activeUnitId: 'g_carpe',
    units: demoUnits(),
    students,
    payoutsByUnit,
    payoutHistoryByUnit,
    issuedCodes: [
      {
        code: 'ACAF-MCK-DEMO-G_CARPE',
        type: 'daily_pass',
        unitId: 'g_carpe',
        holderName: 'Pedro Lima (demo)',
        validUntil: endOfDay.toISOString(),
      },
    ],
    checkInLog,
    pendingCheckIns: demoPendingCheckIns(),
  };
}
