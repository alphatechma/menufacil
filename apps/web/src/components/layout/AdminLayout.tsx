import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { toggleSidebar, toggleMobileMenu, closeMobileMenu, selectSidebarCollapsed, selectMobileMenuOpen } from '@/store/slices/uiSlice';
import { usePermission } from '@/hooks/usePermission';

interface SidebarItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module: string | null;
  permission?: string;
  adminOnly?: boolean;
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
      { to: '/admin/staff', icon: UsersRound, label: 'Equipe', module: null, adminOnly: true },
      { to: '/admin/customization', icon: Palette, label: 'Personalizar', module: null, adminOnly: true },
      { to: '/admin/settings', icon: Settings, label: 'Configuracoes', module: null, adminOnly: true },
    ],
  },
];

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const mobileOpen = useAppSelector(selectMobileMenuOpen);
  const { user, tenantSlug, plan } = useAppSelector((s) => s.adminAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, hasModule, hasFullAccess } = usePermission();

  // Set page title
  useEffect(() => {
    document.title = tenantSlug
      ? `Painel de Gestao - ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}`
      : 'Painel de Gestao';
  }, [tenantSlug]);

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sidebarGroups.forEach((g) => (initial[g.key] = true));
    return initial;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if any item in a group is active
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
        if (item.adminOnly && !hasFullAccess) return false;
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
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 shrink-0">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl shrink-0 shadow-sm"
        >
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-bold text-gray-900 whitespace-nowrap"
            >
              MenuFacil
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 scrollbar-thin">
        {filteredGroups.map((group) => {
          const isActive = isGroupActive(group);
          const isExpanded = expandedGroups[group.key];
          const isSingleItem = group.key === 'main';

          // For collapsed mode, show only icons
          if (collapsed) {
            return (
              <div key={group.key} className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => dispatch(closeMobileMenu())}
                    title={item.label}
                    className={({ isActive: itemActive }) =>
                      `flex items-center justify-center w-full p-2.5 rounded-xl transition-all duration-200 ${
                        itemActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                  </NavLink>
                ))}
              </div>
            );
          }

          // For single-item groups (Dashboard), render directly
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
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        itemActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          }

          // Group with header
          return (
            <div key={group.key} className="pt-2 first:pt-0">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <group.icon className="w-3.5 h-3.5" />
                  <span>{group.label}</span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 0 : -90 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </button>

              {/* Group items */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 pl-2 border-l-2 border-gray-100 mt-0.5 space-y-0.5">
                      {group.items.map((item, i) => (
                        <motion.div
                          key={item.to}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.15 }}
                        >
                          <NavLink
                            to={item.to}
                            end={item.to === '/admin'}
                            onClick={() => dispatch(closeMobileMenu())}
                            className={({ isActive: itemActive }) =>
                              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                itemActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                              }`
                            }
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </NavLink>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Plan badge — only for admins */}
      <AnimatePresence>
        {!collapsed && plan && hasFullAccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="px-3 pb-2 shrink-0"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                dispatch(closeMobileMenu());
                navigate('/admin/plano');
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 text-sm font-medium text-amber-700 hover:from-amber-100 hover:via-orange-100 hover:to-amber-100 transition-all shadow-sm"
            >
              <div className="flex items-center justify-center w-7 h-7 bg-amber-100 rounded-lg">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-amber-800 leading-tight">Plano {plan.name}</p>
                <p className="text-[10px] text-amber-600 leading-tight">Ver detalhes</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User section */}
      <div className="border-t border-gray-100 p-2.5 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center justify-center w-full p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 h-screen sticky top-0 shadow-sm ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => dispatch(closeMobileMenu())}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hasFullAccess && tenantSlug && (
              <Link
                to={`/${tenantSlug}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Vitrine</span>
              </Link>
            )}
            {hasFullAccess && (
              <button className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
              </button>
            )}
            <Link to="/admin/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{user?.role === 'admin' ? 'Administrador' : user?.role || 'Admin'}</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
