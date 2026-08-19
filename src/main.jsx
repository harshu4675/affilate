import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/ui.css';
import './styles/overlay.css';
import './styles/toast.css';
import './styles/dashboard.css';
import './styles/editor.css';
import './styles/preview.css';
import './styles/library.css';
import './styles/responsive.css';
import './styles/store.css';
import './styles/admin.css';
import { App } from './App.jsx';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
