import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader.jsx';

export function AppShell() {
  return (
    <div className="app">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Affilate - Affiliate product importer</span>
        <span className="app-footer-note">Product data is stored locally in your browser.</span>
      </footer>
    </div>
  );
}
