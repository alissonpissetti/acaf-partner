import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

export function AppLayout() {
  const { logout, error, state, isAllUnits, sessionUser } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const support = useSupport();

  useEffect(() => {
    if (isAllUnits && isUnitOnlyPath(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [isAllUnits, location.pathname, navigate]);

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

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <aside id="partner-sidebar" className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              {sidebarCollapsed ? (
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
          </div>

          <div className="sidebar-expanded-only sidebar-expanded-block">
            <UnitSwitcher />
            {error && <p className="sidebar-error">{error}</p>}
            {!state.apiOnline && !error && (
              <p className="sidebar-error">Não foi possível carregar os dados. Recarregue a página.</p>
            )}
          </div>

          <SidebarNav />

          <div className="sidebar-footer">
            {!sidebarCollapsed ? (
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
            ) : (
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
            )}
          </div>
        </div>
      </aside>
      <BrandGradients />
      <main className="main-content">
        <div className="main-inner">
          <FlashViewport />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
