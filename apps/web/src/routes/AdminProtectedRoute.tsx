import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { adminLogin } from '@/store/slices/adminAuthSlice';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.adminAuth.isAuthenticated);
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);

  const impersonateParam = searchParams.get('impersonate');

  useEffect(() => {
    if (!impersonateParam) return;

    try {
      setProcessing(true);
      const data = JSON.parse(atob(impersonateParam));

      // Store token for API calls (Bearer auth)
      localStorage.setItem('menufacil-impersonate-token', data.access_token);
      localStorage.setItem('menufacil-impersonating', 'true');

      // Login with full impersonation data
      dispatch(adminLogin({
        user: data.user,
        tenantSlug: data.tenant_slug,
        modules: data.modules || [],
        permissions: data.permissions || [],
        plan: data.plan || null,
      }));

      // Clean impersonate param from URL
      searchParams.delete('impersonate');
      setSearchParams(searchParams, { replace: true });
    } catch {
      // Invalid impersonate data, ignore
    } finally {
      setProcessing(false);
    }
  }, [impersonateParam, dispatch, searchParams, setSearchParams]);

  if (processing) return null;

  if (!isAuthenticated && !impersonateParam) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
