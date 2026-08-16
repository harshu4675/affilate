import { createHashRouter, RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './state/AppProvider.jsx';
import { ToastProvider } from './components/ui/ToastProvider.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LibraryPage } from './pages/LibraryPage.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { installDevSeed } from './dev/devSeed.js';

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'products/new', element: <EditorPage /> },
      { path: 'products/:id', element: <EditorPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);

function DevSeed() {
  const { products, upsertProduct } = useApp();
  useEffect(() => {
    installDevSeed(products, upsertProduct);
  }, [products, upsertProduct]);
  return null;
}

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <DevSeed />
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProvider>
  );
}
