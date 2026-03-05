import { useAppSelector } from '@/store/hooks';

export function useAdminAuth() {
  const { user, isAuthenticated, tenantSlug, modules, plan } = useAppSelector((s) => s.adminAuth);
  return { user, isAuthenticated, tenantSlug, modules, plan };
}
