import { NavLink } from 'react-router-dom';
import { menuForScope } from '../data/sidebarMenu';
import { usePortal } from '../portalContext';
import './SidebarNav.css';

function linkClass(isActive: boolean, sub?: boolean) {
  const base = sub ? 'nav-link nav-link-sub' : 'nav-link';
  return isActive ? `${base} active` : base;
}

export function SidebarNav() {
  const { isAllUnits } = usePortal();
  const blocks = menuForScope(isAllUnits);

  return (
    <nav className="sidebar-nav" aria-label="Menu principal">
      {isAllUnits && (
        <p className="sidebar-nav-scope-hint">Visão da rede — configure filiais em Unidades ou volte a uma unidade.</p>
      )}
      {blocks.map((block) => {
        if (block.kind === 'link') {
          const { to, label, end } = block.item;
          return (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive)}>
              {label}
            </NavLink>
          );
        }
        return (
          <div key={block.title} className="nav-group">
            <div className="nav-group-title">{block.title}</div>
            <div className="nav-group-items">
              {block.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => linkClass(isActive, true)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
