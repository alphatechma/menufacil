import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Calculator,
  ShoppingCart,
  ChefHat,
  Settings,
  LogOut,
  Package,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useOfflineOrders } from '@/hooks/useOfflineOrders';
import SyncIndicator from '@/components/SyncIndicator';
import { useGetTenantBySlugQuery, useGetOrdersQuery } from '@/api/api';
import { useMemo, useEffect } from 'react';

const NAV_ITEMS = [
  { to: '/', icon: Calculator, label: 'PDV', id: 'pdv' },
  { to: '/orders', icon: ShoppingCart, label: 'Pedidos', id: 'orders' },
  { to: '/kds', icon: ChefHat, label: 'KDS', id: 'kds' },
  { to: '/menu', icon: Package, label: 'Cardapio', id: 'menu' },
  { to: '/settings', icon: Settings, label: 'Configurações', id: 'settings' },
];

export default function DesktopLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);

  // WebSocket for real-time order updates
  const socketRef = useWebSocket();

  // Offline cache & orders
  const { syncStatus, lastSyncTime, syncCache } = useOfflineCache();
  const { pendingCount: pendingOfflineOrders, syncPendingOrders, isSyncing: isSyncingOrders } = useOfflineOrders();

  // Auto-sync offline orders when WebSocket reconnects
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handleConnect = () => {
      if (pendingOfflineOrders > 0) {
        syncPendingOrders();
      }
    };
    socket.on('connect', handleConnect);
    return () => { socket.off('connect', handleConnect); };
  }, [socketRef, pendingOfflineOrders, syncPendingOrders]);

  // Fetch tenant info for display name
  const { data: tenant } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });

  // Fetch orders to compute pending count
  const { data: orders } = useGetOrdersQuery(undefined, {
    pollingInterval: 30000, // refresh every 30s
  });

  const pendingOrdersCount = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return 0;
    return orders.filter((o: any) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status),
    ).length;
  }, [orders]);

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const displayName = tenant?.name ?? tenantSlug ?? 'MenuFacil';

  function handleLogout() {
    dispatch(logout());
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-16 shrink-0 flex-col items-center bg-gray-900 py-4 z-50">
        {/* Logo */}
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <UtensilsCrossed className="h-5 w-5 text-white" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-5 w-5" />
                  {/* Pending orders badge */}
                  {id === 'orders' && pendingOrdersCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                    </span>
                  )}
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute left-full ml-3 z-[100] whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {label}
                    {id === 'orders' && pendingOrdersCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
            title={user?.name ?? 'Usuário'}
          >
            {userInitial}
          </div>
          <button
            onClick={handleLogout}
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="pointer-events-none absolute left-full ml-3 z-[100] whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              {displayName}
            </span>
            {tenant?.units && tenant.units.length > 1 && (
              <select className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30">
                {tenant.units.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3">
            {pendingOrdersCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
                <ShoppingCart className="h-3 w-3" />
                {pendingOrdersCount} pendente{pendingOrdersCount !== 1 ? 's' : ''}
              </span>
            )}
            <SyncIndicator
              syncStatus={syncStatus}
              pendingOrdersCount={pendingOfflineOrders}
              lastSyncTime={lastSyncTime}
              onSync={syncCache}
              onSyncOrders={syncPendingOrders}
              isSyncingOrders={isSyncingOrders}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
