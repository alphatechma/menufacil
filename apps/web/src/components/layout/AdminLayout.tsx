import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Building2,
  MessageCircle,
  ChevronDown,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { baseApi } from '@/api/baseApi';
import { toggleSidebar, toggleMobileMenu, closeMobileMenu, selectSidebarCollapsed, selectMobileMenuOpen, selectIsDark, toggleDarkMode } from '@/store/slices/uiSlice';
import { usePermission } from '@/hooks/usePermission';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import ToastContainer from '@/components/ui/ToastContainer';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { selectToasts } from '@/store/slices/notificationSlice';
import { cn } from '@/utils/cn';
import { Separator } from '@/components/ui/Separator';
import { UnitSelector } from '@/components/layout/UnitSelector';

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
      { to: '/admin/extras', icon: LayoutGrid, label: 'Extras', module: 'products', permission: 'product:read' },
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
      { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp', module: null, permission: 'whatsapp:chat' },
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
      { to: '/admin/units', icon: Building2, label: 'Unidades', module: 'multi_unit', permission: 'unit:read' },
      { to: '/admin/staff', icon: UsersRound, label: 'Equipe', module: null, permission: 'staff:read' },
      { to: '/admin/customization', icon: Palette, label: 'Personalizar', module: null, permission: 'customization:read' },
      { to: '/admin/settings', icon: Settings, label: 'Configuracoes', module: null, permission: 'settings:read' },
    ],
  },
];

function SidebarTooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [visible, setVisible] = useState(false);

  if (!show) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
          <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-border">
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

  useOrderNotifications();

  // Sync dark mode class to <html> so CSS variables and body styles work correctly
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [isDark]);

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
    localStorage.removeItem('menufacil-impersonate-token');
    dispatch(adminLogout());
    dispatch(baseApi.util.resetApiState());
    navigate('/login');
  };

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn('flex items-center h-16 shrink-0', collapsed && !mobile ? 'justify-center' : 'gap-3 px-4')}>
        <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl shrink-0 shadow-sm">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground whitespace-nowrap leading-tight">
              MenuFacil
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Painel Admin
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredGroups.map((group) => {
          const isActive = isGroupActive(group);
          const isExpanded = expandedGroups[group.key];
          const isSingleItem = group.key === 'main';

          if (collapsed && !mobile) {
            return (
              <div key={group.key} className="space-y-0.5 mb-1">
                {!isSingleItem && <Separator className="mx-1 my-2" />}
                {group.items.map((item) => (
                  <SidebarTooltip key={item.to} label={item.label} show>
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => mobile && dispatch(closeMobileMenu())}
                      className={({ isActive: itemActive }) =>
                        cn(
                          'flex items-center justify-center w-full p-2.5 rounded-xl transition-all duration-150',
                          itemActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )
                      }
                    >
                      <item.icon className="w-5 h-5" />
                    </NavLink>
                  </SidebarTooltip>
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
                    onClick={() => mobile && dispatch(closeMobileMenu())}
                    className={({ isActive: itemActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        itemActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )
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
                className={cn(
                  'flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <group.icon className="w-3.5 h-3.5" />
                  <span>{group.label}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    !isExpanded && '-rotate-90',
                  )}
                />
              </button>

              {isExpanded && (
                <div className="ml-2 pl-2 border-l-2 border-border mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => mobile && dispatch(closeMobileMenu())}
                      className={({ isActive: itemActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                          itemActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )
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
      {(!collapsed || mobile) && plan && hasFullAccess && (
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={() => {
              dispatch(closeMobileMenu());
              navigate('/admin/plano');
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/80 dark:border-amber-700/50 text-sm font-medium text-amber-700 dark:text-amber-300 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 transition-colors"
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

      {collapsed && !mobile && plan && hasFullAccess && (
        <div className="px-2 pb-2 shrink-0">
          <SidebarTooltip label={`Plano ${plan.name}`} show>
            <button
              onClick={() => navigate('/admin/plano')}
              className="flex items-center justify-center w-full p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <Crown className="w-5 h-5" />
            </button>
          </SidebarTooltip>
        </div>
      )}

      <Separator />

      {/* User section */}
      <div className="p-3 shrink-0">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <SidebarTooltip label="Sair" show>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full p-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </SidebarTooltip>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <ToastContainer />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-card border-r border-border transition-[width] duration-200 h-screen sticky top-0',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => dispatch(closeMobileMenu())}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card flex flex-col shadow-xl animate-slide-in-left">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <UnitSelector />
            {tenantSlug && (
              <a
                href={`/${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Vitrine</span>
              </a>
            )}

            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifPanelOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Bell className="w-5 h-5" />
                {toasts.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full ring-2 ring-card px-1">
                    {toasts.length}
                  </span>
                )}
              </button>
              <NotificationPanel open={notifPanelOpen} onClose={() => setNotifPanelOpen(false)} />
            </div>
          </div>
        </header>

        {localStorage.getItem('menufacil-impersonating') === 'true' && (
          <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
            <Crown className="w-4 h-4" />
            Voce esta impersonando este tenant (acesso temporario do super-admin)
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
