import { NavLink } from 'react-router-dom';
import { menuForScope } from '../data/sidebarMenu';
import { usePortal } from '../portalContext';
import { NavIcon, type NavIconName } from './SidebarIcons';
import './SidebarNav.css';

function linkClass(isActive: boolean, sub?: boolean) {
  const base = sub ? 'nav-link nav-link-sub' : 'nav-link';
  return isActive ? `${base} active` : base;
}

function NavItem({
  to,
  label,
  icon,
  end,
  sub,
}: {
  to: string;
  label: string;
  icon: NavIconName;
  end?: boolean;
  sub?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) => linkClass(isActive, sub)}
    >
      <span className="nav-link-icon">
        <NavIcon name={icon} />
      </span>
      <span className="nav-link-label">{label}</span>
    </NavLink>
  );
}

export function SidebarNav() {
  const { isAllUnits } = usePortal();
  const blocks = menuForScope(isAllUnits);

  return (
    <nav className="sidebar-nav" aria-label="Menu principal">
      {isAllUnits && (
        <p className="sidebar-nav-scope-hint sidebar-expanded-only">
          Visão da rede — configure filiais em Unidades ou volte a uma unidade.
        </p>
      )}
      {blocks.map((block) => {
        if (block.kind === 'link') {
          const { to, label, icon, end } = block.item;
          return <NavItem key={to} to={to} label={label} icon={icon} end={end} />;
        }
        return (
          <div key={block.title} className="nav-group">
            <div className="nav-group-title sidebar-expanded-only">{block.title}</div>
            <div className="nav-group-items">
              {block.items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  sub
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
