import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { BrandGradients, BrandLogo, BrandMark } from './BrandLogo';
import { FlashViewport } from './FlashMessage';
import { isUnitOnlyPath } from '../data/sidebarMenu';
import { usePortal } from '../portalContext';
import { UnitSwitcher } from './UnitSwitcher';
import { SidebarNav } from './SidebarNav';
import { NavIcon } from './SidebarIcons';
import { useSupport } from './SupportProvider';
import './AppLayout.css';
import './FlashMessage.css';
import './UnitSwitcher.css';
import './SidebarNav.css';

const SIDEBAR_COLLAPSED_KEY = 'connect-partner:sidebar-collapsed';
const MOBILE_NAV_MAX_PX = 960;

function userInitials(name?: string | null) {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')
  ).toUpperCase();
}

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function useMobileNavLayout() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_NAV_MAX_PX}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_NAV_MAX_PX}px)`);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export function AppLayout() {
  const { logout, error, state, isAllUnits, sessionUser } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobileNav = useMobileNavLayout();
  const support = useSupport();

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);

  useEffect(() => {
    if (isAllUnits && isUnitOnlyPath(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [isAllUnits, location.pathname, navigate]);

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  useEffect(() => {
    if (!isMobileNav) closeMobileNav();
  }, [isMobileNav, closeMobileNav]);

  useEffect(() => {
    if (!isMobileNav || !mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileNav, mobileNavOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const activeUnitLabel = isAllUnits
    ? `Toda a rede · ${state.units.length} unidades`
    : state.units.find((u) => u.id === state.activeUnitId)?.unitName ?? 'Unidade';

  const shellClassName = [
    'app-shell',
    !isMobileNav && sidebarCollapsed ? 'is-sidebar-collapsed' : '',
    isMobileNav && mobileNavOpen ? 'is-mobile-nav-open' : '',
    isMobileNav ? 'is-mobile-shell' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClassName}>
      {isMobileNav && mobileNavOpen ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Fechar menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        id="partner-sidebar"
        className="sidebar"
        aria-hidden={isMobileNav ? !mobileNavOpen : undefined}
      >
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              {!isMobileNav && sidebarCollapsed ? (
                <BrandMark size={40} tone="purple" />
              ) : (
                <>
                  <BrandLogo
                    height={28}
                    variant="wordmarkPurple"
                    className="brand-logo--sidebar brand-logo--sidebar-wordmark"
                  />
                  <div className="brand-sub brand-sub-sidebar">Portal do parceiro</div>
                </>
              )}
            </div>
            {isMobileNav ? (
              <button
                type="button"
                className="sidebar-toggle sidebar-toggle--mobile-close"
                onClick={closeMobileNav}
                aria-expanded
                aria-controls="partner-sidebar"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <span className="sidebar-toggle-icon" aria-hidden>
                  ×
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-expanded={!sidebarCollapsed}
                aria-controls="partner-sidebar"
                title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              >
                <span className="sidebar-toggle-icon" aria-hidden>
                  {sidebarCollapsed ? '›' : '‹'}
                </span>
              </button>
            )}
          </div>

          <div className="sidebar-expanded-only sidebar-expanded-block">
            <UnitSwitcher />
            {error && <p className="sidebar-error">{error}</p>}
            {!state.apiOnline && !error && (
              <p className="sidebar-error">Não foi possível carregar os dados. Recarregue a página.</p>
            )}
          </div>

          <SidebarNav onNavigate={isMobileNav ? closeMobileNav : undefined} />

          <div className="sidebar-footer">
            {!isMobileNav && sidebarCollapsed ? (
              <>
                <button
                  type="button"
                  className={`btn btn-ghost sidebar-logout sidebar-support${support.isOpen ? ' is-active' : ''}`}
                  onClick={support.toggleSupport}
                  aria-expanded={support.isOpen}
                  title="Atendimento"
                >
                  <span className="nav-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
                    </svg>
                  </span>
                  <span className="nav-link-label">Atendimento</span>
                  {support.openTicketCount > 0 ? (
                    <span className="sidebar-count" aria-label={`${support.openTicketCount} chamados em aberto`}>
                      {support.openTicketCount > 9 ? '9+' : support.openTicketCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost sidebar-logout"
                  onClick={logout}
                  title="Sair"
                >
                  <span className="nav-link-icon">
                    <NavIcon name="log-out" />
                  </span>
                  <span className="nav-link-label">Sair</span>
                </button>
              </>
            ) : (
              <div className="sidebar-footer-movly">
                {sessionUser ? (
                  <div className="sidebar-user" aria-label="Usuário logado">
                    <span className="sidebar-user-avatar" aria-hidden="true">
                      {userInitials(sessionUser.name)}
                    </span>
                    <span className="sidebar-user-text">
                      <span className="sidebar-user-name">{sessionUser.name}</span>
                      <span className="sidebar-user-email">{sessionUser.email}</span>
                    </span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`sidebar-movly-action sidebar-support${support.isOpen ? ' is-active' : ''}`}
                  onClick={support.toggleSupport}
                  aria-expanded={support.isOpen}
                  title="Atendimento"
                >
                  <span className="nav-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
                    </svg>
                  </span>
                  <span className="nav-link-label">Atendimento</span>
                  {support.openTicketCount > 0 ? (
                    <span className="sidebar-count sidebar-count--on-purple" aria-label={`${support.openTicketCount} chamados em aberto`}>
                      {support.openTicketCount > 9 ? '9+' : support.openTicketCount}
                    </span>
                  ) : null}
                </button>
                <button type="button" className="sidebar-movly-action" onClick={logout} title="Sair">
                  <span className="nav-link-icon">
                    <NavIcon name="log-out" />
                  </span>
                  <span className="nav-link-label">Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="app-main-column">
        <header className="mobile-top-bar">
          <button
            type="button"
            className="mobile-top-bar-menu"
            onClick={openMobileNav}
            aria-expanded={mobileNavOpen}
            aria-controls="partner-sidebar"
            title="Abrir menu"
            aria-label="Abrir menu"
          >
            <span className="mobile-top-bar-menu-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className="mobile-top-bar-context">
            <span className="mobile-top-bar-network">{state.networkName}</span>
            <span className="mobile-top-bar-unit">{activeUnitLabel}</span>
          </div>
          <BrandMark size={32} tone="purple" className="mobile-top-bar-mark" />
        </header>

        <BrandGradients />
        <main className="main-content">
          <div className="main-inner">
            <FlashViewport />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
