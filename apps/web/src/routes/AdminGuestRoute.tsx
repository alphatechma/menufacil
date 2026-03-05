import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function AdminGuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.adminAuth.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
