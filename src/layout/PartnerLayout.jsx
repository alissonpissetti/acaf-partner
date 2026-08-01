import { NavLink, Outlet } from 'react-router-dom';
import './PartnerLayout.css';

const navItems = [
  { to: '/', label: 'Início', end: true },
  { to: '/unit', label: 'Minha unidade' },
  { to: '/daily-pass', label: 'Diárias' },
  { to: '/check-ins', label: 'Check-ins' },
  { to: '/connect', label: 'Planos Connect' },
  { to: '/settings', label: 'Configurações' },
];

export function PartnerLayout() {
  return (
    <div className="partner-shell">
      <aside className="partner-sidebar">
        <div className="partner-brand">
          <span className="partner-brand-mark">P</span>
          <div>
            <strong>ACAF Partner</strong>
            <span>Portal da academia</span>
          </div>
        </div>

        <nav className="partner-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'partner-nav-link active' : 'partner-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <footer className="partner-sidebar-footer">
          <small>Acesso exclusivo da unidade parceira</small>
        </footer>
      </aside>

      <div className="partner-main">
        <header className="partner-topbar">
          <div>
            <h1>Portal do parceiro</h1>
            <p>Gestão da sua academia no ACAF Connect</p>
          </div>
        </header>

        <main className="partner-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
