import './MemberAppGuideListChrome.css';

type GuideListHeaderProps = {
  unitCount: number;
};

export function MemberAppGuideListHeader({ unitCount }: GuideListHeaderProps) {
  const title = `${
    unitCount === 1 ? '1 unidade' : `${unitCount} unidades`
  } perto de você · ordem por distância`;

  return (
    <header className="member-app-guide-list-header">
      <h2 className="member-app-guide-list-title">{title}</h2>
      <div className="member-app-guide-list-actions">
        <span className="member-app-guide-clear">Limpar filtros</span>
        <MemberAppViewToggle />
      </div>
    </header>
  );
}

function MemberAppViewToggle() {
  return (
    <div className="member-app-view-toggle" aria-hidden>
      <button type="button" className="member-app-view-toggle-btn is-active" tabIndex={-1}>
        <ListIcon />
      </button>
      <button type="button" className="member-app-view-toggle-btn" tabIndex={-1}>
        <MapIcon />
      </button>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="m14 6.5-1.5 5 5-1.5L22 4 14 6.5zM4 8l5 2.18V20l2-4V10.18L16 8V4H4v4z" />
    </svg>
  );
}

export function MemberAppBottomNavPreview() {
  return (
    <nav className="member-app-bottom-nav" aria-hidden>
      <button type="button" className="member-app-bottom-nav-item is-selected" tabIndex={-1}>
        <span className="member-app-bottom-nav-icon member-app-bottom-nav-icon--compass" />
        <span>Explorar</span>
      </button>
      <button type="button" className="member-app-bottom-nav-item" tabIndex={-1}>
        <span className="member-app-bottom-nav-icon member-app-bottom-nav-icon--qr" />
        <span>Check-in</span>
      </button>
      <button type="button" className="member-app-bottom-nav-item" tabIndex={-1}>
        <span className="member-app-bottom-nav-icon member-app-bottom-nav-icon--person" />
        <span>Conta</span>
      </button>
    </nav>
  );
}