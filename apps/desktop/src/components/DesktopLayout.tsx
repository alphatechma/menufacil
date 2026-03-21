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

const NAV_ITEMS = [
  { to: '/', icon: Calculator, label: 'PDV' },
  { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/kds', icon: ChefHat, label: 'KDS' },
  { to: '/menu', icon: Package, label: 'Cardapio' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function DesktopLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);

  // WebSocket for real-time order updates
  useWebSocket();

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'U';

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
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute left-full ml-3 z-[100] whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {label}
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
          <span className="text-sm font-semibold text-gray-700">
            {user?.name ? `${user.name}` : tenantSlug ?? 'MenuFacil'}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Conectado
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
