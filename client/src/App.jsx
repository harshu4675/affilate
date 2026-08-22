import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppProvider } from './state/AppProvider.jsx';
import { AdminAuthProvider } from './state/AdminAuthProvider.jsx';
import { ToastProvider } from './components/ui/ToastProvider.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { StoreShell } from './components/store/StoreShell.jsx';
import { StoreHomePage } from './pages/store/StoreHomePage.jsx';
import { ProductDetailPage } from './pages/store/ProductDetailPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LibraryPage } from './pages/LibraryPage.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { Spinner } from './components/ui/Spinner.jsx';

// The admin panel is only loaded when an admin route is opened, so storefront
// visitors never download it.
const AdminShell = lazy(() => import('./components/admin/AdminShell.jsx').then((m) => ({ default: m.AdminShell })));
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage.jsx').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage.jsx').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage.jsx').then((m) => ({ default: m.AdminImportPage })));

function AdminFallback() {
  return (
    <div className="admin-boot">
      <Spinner size={22} />
      <p>Loading admin...</p>
    </div>
  );
}

function AdminRoot() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<AdminFallback />}>
        <AdminShell />
      </Suspense>
    </AdminAuthProvider>
  );
}

const router = createHashRouter([
  {
    // Public Talishh storefront
    path: '/',
    element: <StoreShell />,
    children: [
      { index: true, element: <StoreHomePage /> },
      { path: 'product/:id', element: <ProductDetailPage /> }
    ]
  },
  {
    // Admin panel (server-side session protected)
    path: '/admin',
    element: <AdminRoot />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'import', element: <AdminImportPage /> }
    ]
  },
  {
    // Existing importer workspace (unchanged behavior)
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'import', element: <DashboardPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'products/new', element: <EditorPage /> },
      { path: 'products/:id', element: <EditorPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProvider>
  );
}
