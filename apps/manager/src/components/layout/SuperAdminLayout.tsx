import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Puzzle,
  Shield,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ScrollText,
  ChevronRight as BreadcrumbSep,
  Sun,
  Moon,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', group: 'Principal' },
  { to: '/tenants', icon: Building2, label: 'Estabelecimentos', group: 'Principal' },
  { to: '/plans', icon: CreditCard, label: 'Planos', group: 'Plataforma' },
  { to: '/system-modules', icon: Puzzle, label: 'Modulos', group: 'Plataforma' },
  { to: '/permissions', icon: Shield, label: 'Permissoes', group: 'Plataforma' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Log', group: 'Sistema' },
  { to: '/settings', icon: Settings, label: 'Configuracoes', group: 'Sistema' },
];

const BREADCRUMB_MAP: Record<string, string> = {
  '': 'Dashboard',
  'tenants': 'Estabelecimentos',
  'plans': 'Planos',
  'system-modules': 'Modulos',
  'permissions': 'Permissoes',
  'audit-logs': 'Audit Log',
  'settings': 'Configuracoes',
  'new': 'Novo',
  'edit': 'Editar',
};

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('sa-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sa-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <NavLink to="/" className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors duration-200">
        Dashboard
      </NavLink>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isUuid = segment.length > 20;
        const label = isUuid ? 'Detalhes' : (BREADCRUMB_MAP[segment] || segment);

        return (
          <span key={path} className="flex items-center gap-1.5">
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            {isLast ? (
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">{label}</span>
            ) : (
              <NavLink to={path} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors duration-200">
                {label}
              </NavLink>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sa-sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const theme = useTheme();

  useEffect(() => {
    localStorage.setItem('sa-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Group nav items
  const groups = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc, item) => {
    const group = item.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <img src="/logo-icon.png" alt="MenuFácil" className="w-9 h-9 rounded-xl shrink-0" />
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">MenuFácil</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
              Manager
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="mb-5">
              {(!collapsed || mobile) && (
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-600 font-semibold px-3 mb-2">
                  {groupName}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => mobile && setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative',
                          isActive
                            ? 'text-indigo-700 dark:text-white bg-indigo-500/10 border-l-2 border-indigo-500 ml-0 glow-indigo'
                            : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.04] border-l-2 border-transparent',
                          collapsed && !mobile && 'justify-center px-2',
                        )
                      }
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {(!collapsed || mobile) && <span>{item.label}</span>}
                    </NavLink>
                  );

                  if (collapsed && !mobile) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <div>{link}</div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-zinc-200 dark:border-white/[0.04]">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-semibold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[hsl(var(--sidebar-background))] glow-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-semibold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[hsl(var(--sidebar-background))] glow-green" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full mt-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
            collapsed && !mobile ? 'justify-center px-2' : 'justify-start',
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || mobile) && <span className="ml-2 text-[13px]">Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-[hsl(var(--sidebar-background))] border-r border-zinc-200 dark:border-white/[0.04] transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        {sidebarContent(false)}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-200 z-40 shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-[hsl(var(--sidebar-background))] border-r border-zinc-200 dark:border-white/[0.04]">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          {sidebarContent(true)}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className={cn('transition-all duration-300', collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]')}>
        {/* Top bar — transparent, minimal */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-4 lg:px-8 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.04] transition-all duration-200"
              onClick={theme.toggle}
              title={theme.dark ? 'Modo claro' : 'Modo escuro'}
            >
              {theme.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-white/[0.04]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-semibold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium text-zinc-200">{user?.name}</p>
                  <p className="text-xs text-zinc-500">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-white/[0.04]"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-6 page-enter" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
