import { type ReactNode, useEffect } from 'react';
import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Home, UtensilsCrossed, User, MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectTotalItems, openDrawer } from '@/store/slices/cartSlice';
import { selectTenant, setSelectedUnitId } from '@/store/slices/tenantSlice';
import { useGetPublicUnitsQuery } from '@/api/customerApi';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function CustomerLayout({ children }: { children?: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const tenant = useAppSelector(selectTenant);
  const totalItems = useAppSelector(selectTotalItems);
  const selectedUnitId = useAppSelector((s) => s.tenant.selectedUnitId);
  const { data: units } = useGetPublicUnitsQuery(slug!, { skip: !slug });
  const selectedUnit = units?.find((u: any) => u.id === selectedUnitId);

  const handleChangeUnit = () => {
    dispatch(setSelectedUnitId(null));
    if (slug) {
      localStorage.removeItem(`menufacil-unit-${slug}`);
    }
  };

  useEffect(() => {
    document.title = tenant?.name || 'MenuFacil';
  }, [tenant?.name]);

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
          <Link to={`/${slug}`} className="flex items-center gap-3 min-w-0">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
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
                <span className={`text-xs font-medium ${tenant.is_open ? 'text-green-600' : 'text-red-500'}`}>
                  {tenant.is_open ? 'Aberto agora' : 'Fechado'}
                </span>
              )}
            </div>
          </Link>

          {selectedUnit && units && units.length > 1 && (
            <button
              onClick={handleChangeUnit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{selectedUnit.name}</span>
              <span className="text-[var(--tenant-primary)] font-medium ml-0.5">Trocar</span>
            </button>
          )}

          <button
            onClick={() => dispatch(openDrawer())}
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
      <main className="max-w-3xl mx-auto">{children || <Outlet />}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-around h-16">
          <NavItem to={`/${slug}`} icon={<Home className="w-5 h-5" />} label="Inicio" active={isActive('')} />
          <NavItem to={`/${slug}/menu`} icon={<UtensilsCrossed className="w-5 h-5" />} label="Cardapio" active={isActive('menu')} />
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
              dispatch(openDrawer());
            }}
          />
          <NavItem to={`/${slug}/account`} icon={<User className="w-5 h-5" />} label="Conta" active={isActive('account')} />
        </div>
      </nav>

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
        active ? 'text-[var(--tenant-primary)]' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}
