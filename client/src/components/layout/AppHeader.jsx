import { NavLink, Link } from 'react-router-dom';
import { Icon } from '../icons/Icons.jsx';
import { ConnectionPill } from './ConnectionPill.jsx';

const NAV_ITEMS = [
  { to: '/import', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/library', label: 'Library', icon: 'list', end: false },
  { to: '/admin', label: 'Admin', icon: 'shield', end: false }
];

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/import" className="brand">
          <span className="brand-mark">
            <Icon name="box" size={18} strokeWidth={2} />
          </span>
          <span className="brand-name">Affilate</span>
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-header-right">
          <ConnectionPill />
          <Link to="/products/new" className="btn btn-primary btn-sm header-import">
            <Icon name="plus" size={14} />
            <span className="header-import-label">Import</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
