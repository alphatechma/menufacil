import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppSelector } from '@/store/hooks';
import Login from '@/pages/Login';
import DesktopLayout from '@/components/DesktopLayout';
import PDV from '@/pages/PDV';
import Orders from '@/pages/Orders';
import KDS from '@/pages/KDS';
// CashRegister is integrated into PDV
import PrinterManager from '@/pages/PrinterManager';
import Settings from '@/pages/Settings';

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
        <Route path="orders" element={<Orders />} />
        <Route path="kds" element={<KDS />} />
        <Route path="printer" element={<PrinterManager />} />
        <Route path="settings" element={<Settings />} />
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
