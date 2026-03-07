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
  Moon,
  Sun,
  ShieldCheck,
  ChevronRight as BreadcrumbSep,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Building2, label: 'Tenants' },
  { to: '/plans', icon: CreditCard, label: 'Planos' },
  { to: '/system-modules', icon: Puzzle, label: 'Modulos' },
  { to: '/permissions', icon: Shield, label: 'Permissoes' },
  { to: '/settings', icon: Settings, label: 'Configuracoes' },
];

const BREADCRUMB_MAP: Record<string, string> = {
  '': 'Dashboard',
  'tenants': 'Tenants',
  'plans': 'Planos',
  'system-modules': 'Modulos',
  'permissions': 'Permissoes',
  'settings': 'Configuracoes',
  'new': 'Novo',
  'edit': 'Editar',
};

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('sa-theme') === 'dark');

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
    <nav className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
      <NavLink to="/" className="hover:text-[hsl(var(--foreground))] transition-colors">
        Dashboard
      </NavLink>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isUuid = segment.length > 20;
        const label = isUuid ? 'Detalhes' : (BREADCRUMB_MAP[segment] || segment);

        return (
          <span key={path} className="flex items-center gap-1">
            <BreadcrumbSep className="w-3 h-3 opacity-50" />
            {isLast ? (
              <span className="text-[hsl(var(--foreground))] font-medium">{label}</span>
            ) : (
              <NavLink to={path} className="hover:text-[hsl(var(--foreground))] transition-colors">
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
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    localStorage.setItem('sa-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[hsl(var(--foreground))] whitespace-nowrap leading-tight">
              MenuFacil
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-medium">
              Super Admin
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => mobile && setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
                      collapsed && !mobile && 'justify-center px-2',
                    )
                  }
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {(!collapsed || mobile) && <span>{item.label}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && !mobile && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      <Separator />

      {/* User Section */}
      <div className="p-3">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--muted))]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{user?.name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full mt-2 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
            collapsed && !mobile ? 'justify-center px-2' : 'justify-start',
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || mobile) && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          {sidebarContent(true)}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className={cn('transition-all duration-200', collapsed ? 'lg:ml-[68px]' : 'lg:ml-64')}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 backdrop-blur-md flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex h-8 w-8" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <div className="hidden sm:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDark}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 lg:p-6 max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
