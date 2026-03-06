import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Tables from './pages/Tables';
import TableDetail from './pages/TableDetail';
import NewOrder from './pages/NewOrder';
import TableBill from './pages/TableBill';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
        <Route path="/tables/:tableId" element={<ProtectedRoute><TableDetail /></ProtectedRoute>} />
        <Route path="/tables/:tableId/new-order" element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
        <Route path="/tables/:tableId/bill" element={<ProtectedRoute><TableBill /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
