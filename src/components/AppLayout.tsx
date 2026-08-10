import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AcafConnectLogo } from './AcafConnectLogo';
import { FlashViewport } from './FlashMessage';
import { isUnitOnlyPath } from '../data/sidebarMenu';
import { usePortal } from '../portalContext';
import { UnitSwitcher } from './UnitSwitcher';
import { SidebarNav } from './SidebarNav';
import { NavIcon } from './SidebarIcons';
import './AppLayout.css';
import './FlashMessage.css';
import './UnitSwitcher.css';
import './SidebarNav.css';

const SIDEBAR_COLLAPSED_KEY = 'acaf-partner:sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const { logout, error, state, isAllUnits } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

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
                <span className="brand-mark" aria-label="ACAF Connect">A</span>
              ) : (
                <>
                  <AcafConnectLogo height={36} className="acaf-connect-logo--sidebar" />
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
          </div>
        </div>
      </aside>
      <main className="main-content">
        <FlashViewport />
        <Outlet />
      </main>
    </div>
  );
}
