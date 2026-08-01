export type NavLinkItem = {
  to: string;
  label: string;
  end?: boolean;
  /** Oculto quando a visão é "Todas as unidades". */
  unitOnly?: boolean;
};

export type NavBlock =
  | { kind: 'link'; item: NavLinkItem }
  | { kind: 'group'; title: string; unitOnly?: boolean; items: NavLinkItem[] };

export const SIDEBAR_MENU: NavBlock[] = [
  { kind: 'link', item: { to: '/', label: 'Dashboard', end: true } },
  { kind: 'link', item: { to: '/check-in', label: 'Check-in', unitOnly: true } },
  {
    kind: 'group',
    title: 'Comercial',
    unitOnly: true,
    items: [
      { to: '/comercial/planos', label: 'Planos Connect', unitOnly: true },
      { to: '/comercial/diarias', label: 'Diárias', unitOnly: true },
      { to: '/comercial/alunos', label: 'Clientes', unitOnly: true },
    ],
  },
  {
    kind: 'group',
    title: 'Cadastro',
    items: [
      { to: '/unidades', label: 'Unidades' },
      { to: '/dados-cadastrais', label: 'Dados cadastrais', unitOnly: true },
    ],
  },
  {
    kind: 'group',
    title: 'Financeiro',
    items: [
      { to: '/financeiro/extrato', label: 'Extrato financeiro' },
      { to: '/financeiro/saques', label: 'Saques' },
    ],
  },
];

/** Rotas que exigem visão de uma unidade (redireciona ao ativar "Todas"). */
export const UNIT_ONLY_PATHS = [
  '/check-in',
  '/comercial/planos',
  '/comercial/diarias',
  '/comercial/alunos',
  '/dados-cadastrais',
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
