import { useState, useMemo, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed, Calculator, ShoppingCart, ChefHat, Settings, LogOut,
  BarChart3, FolderTree, Package, ListPlus, MapPin, Bike, LayoutGrid,
  CalendarCheck, Users, Ticket, Heart, Warehouse, UsersRound, ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useOfflineOrders } from '@/hooks/useOfflineOrders';
import SyncIndicator from '@/components/SyncIndicator';
import { useGetTenantBySlugQuery, useGetOrdersQuery } from '@/api/api';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    key: 'ops', label: 'Operacao', icon: ShoppingCart,
    items: [
      { to: '/', icon: Calculator, label: 'PDV' },
      { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
      { to: '/kds', icon: ChefHat, label: 'KDS' },
      { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    ],
  },
  {
    key: 'menu', label: 'Cardapio', icon: Package,
    items: [
      { to: '/categories', icon: FolderTree, label: 'Categorias' },
      { to: '/products', icon: Package, label: 'Produtos' },
      { to: '/extras', icon: ListPlus, label: 'Extras' },
      { to: '/menu', icon: Package, label: 'Cardapio Rapido' },
    ],
  },
  {
    key: 'delivery', label: 'Entregas', icon: Bike,
    items: [
      { to: '/delivery-zones', icon: MapPin, label: 'Zonas de Entrega' },
      { to: '/delivery-persons', icon: Bike, label: 'Entregadores' },
    ],
  },
  {
    key: 'tables', label: 'Mesas', icon: LayoutGrid,
    items: [
      { to: '/tables', icon: LayoutGrid, label: 'Mesas' },
      { to: '/reservations', icon: CalendarCheck, label: 'Reservas' },
    ],
  },
  {
    key: 'clients', label: 'Clientes', icon: Users,
    items: [
      { to: '/customers', icon: Users, label: 'Clientes' },
      { to: '/coupons', icon: Ticket, label: 'Cupons' },
      { to: '/loyalty', icon: Heart, label: 'Fidelidade' },
    ],
  },
  {
    key: 'admin', label: 'Administracao', icon: Settings,
    items: [
      { to: '/inventory', icon: Warehouse, label: 'Estoque' },
      { to: '/staff', icon: UsersRound, label: 'Equipe' },
      { to: '/settings', icon: Settings, label: 'Configuracoes' },
    ],
  },
];

export default function DesktopLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);

  const socketRef = useWebSocket();
  const { syncStatus, lastSyncTime, syncCache } = useOfflineCache();
  const { pendingCount: pendingOfflineOrders, syncPendingOrders, isSyncing: isSyncingOrders } = useOfflineOrders();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handleConnect = () => { if (pendingOfflineOrders > 0) syncPendingOrders(); };
    socket.on('connect', handleConnect);
    return () => { socket.off('connect', handleConnect); };
  }, [socketRef, pendingOfflineOrders, syncPendingOrders]);

  const { data: tenant } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const { data: orders } = useGetOrdersQuery(undefined, { pollingInterval: 30000 });

  const pendingOrdersCount = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return 0;
    return orders.filter((o: any) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;
  }, [orders]);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SIDEBAR_GROUPS.forEach((g) => (init[g.key] = false));
    return init;
  });

  useEffect(() => {
    const active = SIDEBAR_GROUPS.find((g) => isGroupActive(g));
    if (active && !expanded[active.key]) {
      setExpanded((prev) => ({ ...prev, [active.key]: true }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const opening = !prev[key];
      if (!opening) return { ...prev, [key]: false };
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) {
        const group = SIDEBAR_GROUPS.find((g) => g.key === k);
        next[k] = k === key || (group ? isGroupActive(group) : false);
      }
      return next;
    });
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const displayName = tenant?.name ?? tenantSlug ?? 'MenuFacil';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-gray-900 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">MenuFacil</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Desktop</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {SIDEBAR_GROUPS.map((group) => {
            const isActive = isGroupActive(group);
            const isOpen = expanded[group.key];
            const GroupIcon = group.icon;

            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors',
                    isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="w-3.5 h-3.5" />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', !isOpen && '-rotate-90')} />
                </button>

                <div className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
                )}>
                  <div className="ml-3 pl-2 border-l border-gray-700/50 space-y-0.5 pb-1">
                    {group.items.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive: itemActive }) =>
                          cn(
                            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                            itemActive
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                          )
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{label}</span>
                        {to === '/orders' && pendingOrdersCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 shrink-0 border-t border-gray-800">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-800/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { dispatch(logout()); navigate('/login'); }}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
          <span className="text-sm font-semibold text-gray-700">{displayName}</span>
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

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
