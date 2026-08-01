import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AcafConnectLogo } from './AcafConnectLogo';
import { isUnitOnlyPath } from '../data/sidebarMenu';
import { usePortal } from '../portalContext';
import { UnitSwitcher } from './UnitSwitcher';
import { SidebarNav } from './SidebarNav';
import './AppLayout.css';
import './UnitSwitcher.css';
import './SidebarNav.css';

export function AppLayout() {
  const { logout, error, state, isAllUnits } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAllUnits && isUnitOnlyPath(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [isAllUnits, location.pathname, navigate]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <AcafConnectLogo height={36} className="acaf-connect-logo--sidebar" />
          <div className="brand-sub brand-sub-sidebar">Portal do parceiro</div>
        </div>
        <UnitSwitcher />
        {error && <p className="sidebar-error">{error}</p>}
        {!state.apiOnline && !error && (
          <p className="sidebar-error">Não foi possível carregar os dados. Recarregue a página.</p>
        )}
        <SidebarNav />
        <button type="button" className="btn btn-ghost sidebar-logout" onClick={logout}>
          Sair
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
