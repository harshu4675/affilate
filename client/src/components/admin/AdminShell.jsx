import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../state/AdminAuthProvider.jsx';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage.jsx';
import { TalishhLogo } from '../store/TalishhLogo.jsx';
import { Icon } from '../icons/Icons.jsx';
import { Spinner } from '../ui/Spinner.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products', icon: 'box', end: false },
  { to: '/admin/import', label: 'Import & publish', icon: 'upload', end: false }
];

export function AdminShell() {
  const { status, username, usingDefaultPassword, logout } = useAdminAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="admin-boot">
        <Spinner size={22} />
        <p>Checking your session...</p>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="admin-boot">
        <Icon name="cloudOff" size={24} />
        <h1>Admin service unavailable</h1>
        <p>The Talishh API is not reachable. Start the server and reload this page.</p>
      </div>
    );
  }

  if (status !== 'authenticated') return <AdminLoginPage />;

  return (
    <div className={`admin${navOpen ? ' admin-nav-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <TalishhLogo size="sm" />
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <a className="admin-nav-link" href="#/" target="_blank" rel="noreferrer">
            <Icon name="external" size={16} />
            <span>View storefront</span>
          </a>
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">
            <span className="admin-user-avatar">{(username || 'A').slice(0, 1).toUpperCase()}</span>
            <span className="admin-user-name">{username}</span>
          </div>
          <button type="button" className="admin-ghost-btn" onClick={logout}>
            <Icon name="undo" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="admin-nav-scrim"
        aria-label="Close navigation"
        onClick={() => setNavOpen(false)}
        tabIndex={navOpen ? 0 : -1}
      />

      <div className="admin-content">
        <header className="admin-topbar">
          <button type="button" className="admin-nav-toggle" onClick={() => setNavOpen((prev) => !prev)} aria-label="Toggle navigation">
            <Icon name="list" size={18} />
          </button>
          <TalishhLogo size="sm" className="admin-topbar-logo" />
          <a className="admin-ghost-btn admin-topbar-view" href="#/" target="_blank" rel="noreferrer">
            <Icon name="external" size={15} />
            <span>Storefront</span>
          </a>
        </header>

        {usingDefaultPassword && (
          <div className="admin-alert admin-alert-warning" role="status">
            <Icon name="shield" size={16} />
            <span>
              You are signed in with the development default password. Set <code>ADMIN_USERNAME</code> and{' '}
              <code>ADMIN_PASSWORD</code> environment variables before deploying.
            </span>
          </div>
        )}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
