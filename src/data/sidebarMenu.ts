export type NavIconName =
  | 'dashboard'
  | 'calendar'
  | 'sun'
  | 'layers'
  | 'scan'
  | 'users'
  | 'building'
  | 'receipt'
  | 'wallet'
  | 'key'
  | 'chart'
  | 'log-out';

export type NavLinkItem = {
  to: string;
  label: string;
  icon: NavIconName;
  end?: boolean;
  /** Oculto quando a visão é "Todas as unidades". */
  unitOnly?: boolean;
};

export type NavBlock =
  | { kind: 'link'; item: NavLinkItem }
  | { kind: 'group'; title: string; unitOnly?: boolean; items: NavLinkItem[] };

export const SIDEBAR_MENU: NavBlock[] = [
  { kind: 'link', item: { to: '/', label: 'Dashboard', icon: 'dashboard', end: true } },
  {
    kind: 'group',
    title: 'Operação',
    unitOnly: true,
    items: [
      { to: '/comercial/agenda', label: 'Programação', icon: 'calendar', unitOnly: true },
      { to: '/comercial/diarias', label: 'Diárias', icon: 'sun', unitOnly: true },
      { to: '/comercial/planos', label: 'Planos', icon: 'layers', unitOnly: true },
      { to: '/check-in', label: 'Check-in', icon: 'scan', unitOnly: true },
    ],
  },
  {
    kind: 'group',
    title: 'Comercial',
    unitOnly: true,
    items: [{ to: '/comercial/alunos', label: 'Clientes', icon: 'users', unitOnly: true }],
  },
  {
    kind: 'group',
    title: 'Cadastro',
    items: [{ to: '/unidades', label: 'Unidades', icon: 'building' }],
  },
  {
    kind: 'group',
    title: 'Financeiro',
    items: [
      { to: '/financeiro/extrato', label: 'Extrato financeiro', icon: 'receipt' },
      { to: '/financeiro/previsao', label: 'Previsão financeira', icon: 'chart' },
      { to: '/financeiro/saques', label: 'Saques', icon: 'wallet' },
      { to: '/financeiro/chaves-pix', label: 'Chaves Pix', icon: 'key' },
    ],
  },
];

/** Rotas que exigem visão de uma unidade (redireciona ao ativar "Todas"). */
export const UNIT_ONLY_PATHS = [
  '/check-in',
  '/comercial/planos',
  '/comercial/diarias',
  '/comercial/agenda',
  '/comercial/alunos',
];

export function isUnitOnlyPath(pathname: string): boolean {
  return UNIT_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function menuForScope(isAllUnits: boolean): NavBlock[] {
  if (!isAllUnits) return SIDEBAR_MENU;

  return SIDEBAR_MENU.map((block) => {
    if (block.kind === 'link') {
      return block.item.unitOnly ? null : block;
    }
    const items = block.items.filter((i) => !i.unitOnly);
    if (items.length === 0) return null;
    return { ...block, items };
  }).filter((b): b is NavBlock => b !== null);
}
