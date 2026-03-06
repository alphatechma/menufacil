import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingCart,
  Monitor,
  Users,
  MapPin,
  Ticket,
  Heart,
  BarChart3,
  Settings,
  Palette,
  LayoutGrid,
  Map,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  UtensilsCrossed,
  Bell,
  ExternalLink,
  Crown,
  Truck,
  UsersRound,
  Navigation,
  Bike,
  ChevronDown,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { toggleSidebar, toggleMobileMenu, closeMobileMenu, selectSidebarCollapsed, selectMobileMenuOpen, selectIsDark, toggleDarkMode } from '@/store/slices/uiSlice';
import { usePermission } from '@/hooks/usePermission';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import ToastContainer from '@/components/ui/ToastContainer';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { selectToasts } from '@/store/slices/notificationSlice';

interface SidebarItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module: string | null;
  permission?: string;
}

interface SidebarGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    key: 'main',
    label: 'Principal',
    icon: LayoutDashboard,
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard', permission: 'dashboard:read' },
    ],
  },
  {
    key: 'menu',
    label: 'Cardapio',
    icon: Package,
    items: [
      { to: '/admin/categories', icon: FolderTree, label: 'Categorias', module: 'categories', permission: 'category:read' },
      { to: '/admin/products', icon: Package, label: 'Produtos', module: 'products', permission: 'product:read' },
    ],
  },
  {
    key: 'ops',
    label: 'Operacao',
    icon: ShoppingCart,
    items: [
      { to: '/admin/orders', icon: ShoppingCart, label: 'Pedidos', module: 'orders', permission: 'order:read' },
      { to: '/admin/kds', icon: Monitor, label: 'KDS', module: 'kds', permission: 'kds:read' },
      { to: '/admin/deliveries', icon: Navigation, label: 'Entregas', module: 'delivery', permission: 'delivery:read' },
      { to: '/admin/delivery-zones', icon: MapPin, label: 'Zonas de Entrega', module: 'delivery', permission: 'delivery:read' },
      { to: '/admin/delivery-persons', icon: Truck, label: 'Entregadores', module: 'delivery', permission: 'delivery:read' },
      { to: '/admin/my-deliveries', icon: Bike, label: 'Minhas Entregas', module: 'delivery_driver', permission: 'delivery_driver:read' },
    ],
  },
  {
    key: 'dine_in',
    label: 'Consumo no Local',
    icon: UtensilsCrossed,
    items: [
      { to: '/admin/tables', icon: LayoutGrid, label: 'Mesas', module: 'dine_in', permission: 'table:read' },
      { to: '/admin/floor-plan', icon: Map, label: 'Mapa do Salao', module: 'dine_in', permission: 'floor_plan:read' },
      { to: '/admin/reservations', icon: CalendarCheck, label: 'Reservas', module: 'dine_in', permission: 'reservation:read' },
    ],
  },
  {
    key: 'clients',
    label: 'Clientes',
    icon: Users,
    items: [
      { to: '/admin/customers', icon: Users, label: 'Clientes', module: 'customers', permission: 'customer:read' },
      { to: '/admin/loyalty', icon: Heart, label: 'Fidelidade', module: 'loyalty', permission: 'loyalty:read' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: Ticket,
    items: [
      { to: '/admin/coupons', icon: Ticket, label: 'Cupons', module: 'coupons', permission: 'coupon:read' },
    ],
  },
  {
    key: 'reports',
    label: 'Relatorios',
    icon: BarChart3,
    items: [
      { to: '/admin/reports', icon: BarChart3, label: 'Relatorios', module: 'reports', permission: 'report:read' },
    ],
  },
  {
    key: 'admin',
    label: 'Administracao',
    icon: Settings,
    items: [
      { to: '/admin/staff', icon: UsersRound, label: 'Equipe', module: null, permission: 'staff:read' },
      { to: '/admin/customization', icon: Palette, label: 'Personalizar', module: null, permission: 'customization:read' },
      { to: '/admin/settings', icon: Settings, label: 'Configuracoes', module: null, permission: 'settings:read' },
    ],
  },
];

function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!show) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const mobileOpen = useAppSelector(selectMobileMenuOpen);
  const isDark = useAppSelector(selectIsDark);
  const { user, tenantSlug, plan } = useAppSelector((s) => s.adminAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, hasModule, hasFullAccess } = usePermission();

  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const toasts = useAppSelector(selectToasts);

  // Connect to WebSocket for real-time order notifications
  useOrderNotifications();

  useEffect(() => {
    document.title = tenantSlug
      ? `Painel de Gestao - ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}`
      : 'Painel de Gestao';
  }, [tenantSlug]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sidebarGroups.forEach((g) => (initial[g.key] = true));
    return initial;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupActive = (group: SidebarGroup) => {
    return group.items.some((item) => {
      if (item.to === '/admin') return location.pathname === '/admin';
      return location.pathname.startsWith(item.to);
    });
  };

  const filteredGroups = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.module && !hasModule(item.module)) return false;
        if (item.permission && !hasPermission(item.permission)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    dispatch(adminLogout());
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} h-16 border-b border-gray-100 dark:border-gray-700 shrink-0`}>
        <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl shrink-0">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
            MenuFacil
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {filteredGroups.map((group) => {
          const isActive = isGroupActive(group);
          const isExpanded = expandedGroups[group.key];
          const isSingleItem = group.key === 'main';

          if (collapsed) {
            return (
              <div key={group.key} className="space-y-0.5 mb-1">
                {!isSingleItem && (
                  <div className="h-px bg-gray-100 dark:bg-gray-700 mx-1 my-2" />
                )}
                {group.items.map((item) => (
                  <Tooltip key={item.to} label={item.label} show={collapsed}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => dispatch(closeMobileMenu())}
                      className={({ isActive: itemActive }) =>
                        `flex items-center justify-center w-full p-2.5 rounded-xl transition-colors ${
                          itemActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                    </NavLink>
                  </Tooltip>
                ))}
              </div>
            );
          }

          if (isSingleItem) {
            return (
              <div key={group.key}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => dispatch(closeMobileMenu())}
                    className={({ isActive: itemActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        itemActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          }

          return (
            <div key={group.key} className="pt-2 first:pt-0">
              <button
                onClick={() => toggleGroup(group.key)}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <group.icon className="w-3.5 h-3.5" />
                  <span>{group.label}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-2 pl-2 border-l-2 border-gray-100 dark:border-gray-700 mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => dispatch(closeMobileMenu())}
                      className={({ isActive: itemActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          itemActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Plan badge */}
      {!collapsed && plan && hasFullAccess && (
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={() => {
              dispatch(closeMobileMenu());
              navigate('/admin/plano');
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/80 dark:border-amber-700/50 text-sm font-medium text-amber-700 dark:text-amber-300 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 transition-colors"
          >
            <div className="flex items-center justify-center w-7 h-7 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-tight">Plano {plan.name}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">Ver detalhes</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}

      {collapsed && plan && hasFullAccess && (
        <div className="px-2 pb-2 shrink-0">
          <Tooltip label={`Plano ${plan.name}`} show>
            <button
              onClick={() => {
                dispatch(closeMobileMenu());
                navigate('/admin/plano');
              }}
              className="flex items-center justify-center w-full p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <Crown className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-gray-100 dark:border-gray-700 p-2.5 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Tooltip label="Sair" show>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full p-2.5 rounded-xl text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${isDark ? 'dark' : ''}`}>
      <ToastContainer />
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200/80 dark:border-gray-700 transition-[width] duration-200 h-screen sticky top-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => dispatch(closeMobileMenu())}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 flex flex-col shadow-xl animate-slide-in-left">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200/80 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {tenantSlug && (
              <Link
                to={`/${tenantSlug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Vitrine</span>
              </Link>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifPanelOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {toasts.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-slate-800 px-1">
                    {toasts.length}
                  </span>
                )}
              </button>
              <NotificationPanel open={notifPanelOpen} onClose={() => setNotifPanelOpen(false)} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
