import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const allSidebarItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: null },
  { to: '/categories', icon: FolderTree, label: 'Categorias', module: 'categories' },
  { to: '/products', icon: Package, label: 'Produtos', module: 'products' },
  { to: '/orders', icon: ShoppingCart, label: 'Pedidos', module: 'orders' },
  { to: '/kds', icon: Monitor, label: 'KDS', module: 'kds' },
  { to: '/customers', icon: Users, label: 'Clientes', module: 'customers' },
  { to: '/delivery-zones', icon: MapPin, label: 'Zonas de Entrega', module: 'delivery' },
  { to: '/coupons', icon: Ticket, label: 'Cupons', module: 'coupons' },
  { to: '/loyalty', icon: Heart, label: 'Fidelidade', module: 'loyalty' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios', module: 'reports' },
  { to: '/customization', icon: Palette, label: 'Personalizar', module: null },
  { to: '/settings', icon: Settings, label: 'Configuracoes', module: null },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, tenantSlug, modules, plan, logout } = useAuthStore();
  const navigate = useNavigate();

  const sidebarItems = allSidebarItems.filter(
    (item) => item.module === null || modules.includes(item.module),
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-lg shrink-0">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 whitespace-nowrap">MenuFacil</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Plan badge */}
      {!collapsed && plan && (
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={() => {
              setMobileOpen(false);
              navigate('/plano');
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-sm font-medium text-amber-700 hover:from-amber-100 hover:to-orange-100 transition-all"
          >
            <Crown className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Plano {plan.name}</span>
          </button>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 h-screen sticky top-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop collapse button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Ver Vitrine */}
            {tenantSlug && (
              <a
                href={`${(window as any).__RUNTIME_CONFIG__?.CUSTOMER_URL || 'http://localhost:5173'}/${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-primary border border-primary/30 hover:bg-primary-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Vitrine</span>
              </a>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>

            {/* User info */}
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary-100 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.role || 'Administrador'}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
