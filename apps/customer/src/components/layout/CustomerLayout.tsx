import { useEffect, type ReactNode } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Home,
  UtensilsCrossed,
  User,
  Store,
} from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import { useCartStore } from '../../store/cartStore';
import { CartDrawer } from '../cart/CartDrawer';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { tenant, isLoading, error, fetchTenant, fetchCategories } =
    useTenantStore();
  const { getTotalItems, openDrawer } = useCartStore();
  const totalItems = getTotalItems();

  useEffect(() => {
    if (slug && (!tenant || tenant.slug !== slug)) {
      fetchTenant(slug);
      fetchCategories();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            Loja nao encontrada
          </h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    const base = `/${slug}`;
    if (path === '') return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname.startsWith(`${base}/${path}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to={`/${slug}`}
            className="flex items-center gap-3 min-w-0"
          >
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                {tenant?.name?.charAt(0) || 'M'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate text-lg leading-tight">
                {tenant?.name || 'MenuFacil'}
              </h1>
              {tenant?.is_open !== undefined && (
                <span
                  className={`text-xs font-medium ${
                    tenant.is_open ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tenant.is_open ? 'Aberto agora' : 'Fechado'}
                </span>
              )}
            </div>
          </Link>

          <button
            onClick={openDrawer}
            className="relative p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="w-6 h-6 text-gray-700" />
            {totalItems > 0 && (
              <span
                className="badge absolute -top-0.5 -right-0.5 text-white"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-around h-16">
          <NavItem
            to={`/${slug}`}
            icon={<Home className="w-5 h-5" />}
            label="Inicio"
            active={isActive('')}
          />
          <NavItem
            to={`/${slug}/menu`}
            icon={<UtensilsCrossed className="w-5 h-5" />}
            label="Cardapio"
            active={isActive('menu')}
          />
          <NavItem
            to={`/${slug}`}
            icon={
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span
                    className="badge absolute -top-2 -right-2.5 text-white text-[10px]"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  >
                    {totalItems}
                  </span>
                )}
              </div>
            }
            label="Carrinho"
            active={false}
            onClick={(e) => {
              e.preventDefault();
              openDrawer();
            }}
          />
          <NavItem
            to={`/${slug}/account`}
            icon={<User className="w-5 h-5" />}
            label="Conta"
            active={isActive('account')}
          />
        </div>
      </nav>

      {/* Cart Drawer */}
      <CartDrawer />
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
        active
          ? 'text-[var(--tenant-primary)]'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}
