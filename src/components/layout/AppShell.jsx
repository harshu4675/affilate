import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader.jsx';
import { Icon } from '../icons/Icons.jsx';
import { useApp } from '../../state/AppProvider.jsx';

export function AppShell() {
  const { persistenceError, clearPersistenceError } = useApp();
  return (
    <div className="app">
      <AppHeader />
      {persistenceError && (
        <div className="storage-alert" role="alert">
          <Icon name="alertTriangle" size={17} />
          <div>
            <strong>Changes were not saved</strong>
            <span>{persistenceError.message}</span>
          </div>
          <button type="button" className="icon-btn icon-btn-sm" onClick={clearPersistenceError} aria-label="Dismiss storage warning">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
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
