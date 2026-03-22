import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { PageSpinner } from '@/components/ui/Spinner';

const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));

/**
 * /admin index route: shows Dashboard if user has permission,
 * otherwise redirects to the first accessible page.
 */
const FALLBACK_ROUTES: { path: string; permission: string; module: string }[] = [
  { path: '/admin/orders', permission: 'order:read', module: 'orders' },
  { path: '/admin/kds', permission: 'kds:read', module: 'kds' },
  { path: '/admin/my-deliveries', permission: 'delivery_driver:read', module: 'delivery_driver' },
  { path: '/admin/products', permission: 'product:read', module: 'products' },
  { path: '/admin/categories', permission: 'category:read', module: 'categories' },
  { path: '/admin/deliveries', permission: 'delivery:read', module: 'delivery' },
  { path: '/admin/customers', permission: 'customer:read', module: 'customers' },
  { path: '/admin/coupons', permission: 'coupon:read', module: 'coupons' },
  { path: '/admin/loyalty', permission: 'loyalty:read', module: 'loyalty' },
  { path: '/admin/reports', permission: 'report:read', module: 'reports' },
];

export default function AdminIndexRedirect() {
  const { hasPermission, hasModule, hasFullAccess } = usePermission();

  // Admin/super_admin always sees dashboard
  if (hasFullAccess) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Dashboard />
      </Suspense>
    );
  }

  // User has dashboard permission
  if (hasModule('dashboard') && hasPermission('dashboard:read')) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Dashboard />
      </Suspense>
    );
  }

  // No dashboard access — redirect to first accessible route
  for (const route of FALLBACK_ROUTES) {
    if (hasModule(route.module) && hasPermission(route.permission)) {
      return <Navigate to={route.path} replace />;
    }
  }

  // Nothing accessible — show a message
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-gray-500 font-medium">Sem permissões configuradas</p>
        <p className="text-sm text-gray-400 mt-1">Contate o administrador para configurar seu acesso.</p>
      </div>
    </div>
  );
}
