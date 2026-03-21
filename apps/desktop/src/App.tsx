import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { lazy, Suspense } from 'react';
import { store } from '@/store';
import { useAppSelector } from '@/store/hooks';
import Login from '@/pages/Login';
import DesktopLayout from '@/components/DesktopLayout';
import PDV from '@/pages/PDV';

// Lazy-loaded pages
const Orders = lazy(() => import('@/pages/Orders'));
const KDS = lazy(() => import('@/pages/KDS'));
const Menu = lazy(() => import('@/pages/Menu'));
const Settings = lazy(() => import('@/pages/Settings'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Categories = lazy(() => import('@/pages/Categories'));
const Products = lazy(() => import('@/pages/Products'));
const ExtraGroups = lazy(() => import('@/pages/ExtraGroups'));
const Customers = lazy(() => import('@/pages/Customers'));
const Coupons = lazy(() => import('@/pages/Coupons'));
const DeliveryZones = lazy(() => import('@/pages/DeliveryZones'));
const DeliveryPersons = lazy(() => import('@/pages/DeliveryPersons'));
const Tables = lazy(() => import('@/pages/Tables'));
const Reservations = lazy(() => import('@/pages/Reservations'));
const Staff = lazy(() => import('@/pages/Staff'));
const Loyalty = lazy(() => import('@/pages/Loyalty'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Units = lazy(() => import('@/pages/Units'));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestGuard>
            <Login />
          </GuestGuard>
        }
      />
      <Route
        element={
          <AuthGuard>
            <DesktopLayout />
          </AuthGuard>
        }
      >
        <Route index element={<PDV />} />
        <Route path="orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
        <Route path="kds" element={<Suspense fallback={<PageLoader />}><KDS /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="menu" element={<Suspense fallback={<PageLoader />}><Menu /></Suspense>} />
        <Route path="categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
        <Route path="extras" element={<Suspense fallback={<PageLoader />}><ExtraGroups /></Suspense>} />
        <Route path="customers" element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
        <Route path="coupons" element={<Suspense fallback={<PageLoader />}><Coupons /></Suspense>} />
        <Route path="delivery-zones" element={<Suspense fallback={<PageLoader />}><DeliveryZones /></Suspense>} />
        <Route path="delivery-persons" element={<Suspense fallback={<PageLoader />}><DeliveryPersons /></Suspense>} />
        <Route path="tables" element={<Suspense fallback={<PageLoader />}><Tables /></Suspense>} />
        <Route path="reservations" element={<Suspense fallback={<PageLoader />}><Reservations /></Suspense>} />
        <Route path="staff" element={<Suspense fallback={<PageLoader />}><Staff /></Suspense>} />
        <Route path="loyalty" element={<Suspense fallback={<PageLoader />}><Loyalty /></Suspense>} />
        <Route path="inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
        <Route path="units" element={<Suspense fallback={<PageLoader />}><Units /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
