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
