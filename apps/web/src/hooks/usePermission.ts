import { useAppSelector } from '@/store/hooks';

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'SUPER_ADMIN', 'ADMIN'];

export function usePermission() {
  const { user, permissions, modules } = useAppSelector((s) => s.adminAuth);
  const role = user?.role || '';
  const hasFullAccess = FULL_ACCESS_ROLES.includes(role);

  const hasPermission = (permission: string): boolean => {
    if (hasFullAccess) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (hasFullAccess) return true;
    return perms.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (hasFullAccess) return true;
    return perms.every((p) => permissions.includes(p));
  };

  const hasModule = (moduleKey: string): boolean => {
    return modules.includes(moduleKey);
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions, hasModule, hasFullAccess, role };
}
