import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Flame, Heart } from 'lucide-react';
import { useGetStorefrontProductsQuery, useGetStorefrontCategoriesQuery } from '@/api/customerApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleFavorite, selectFavoriteIds } from '@/store/slices/favoritesSlice';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';
import { SmartSearch } from '@/components/ui/SmartSearch';

const DIETARY_FILTERS = [
  { key: 'vegetariano', label: 'Vegetariano' },
  { key: 'vegano', label: 'Vegano' },
  { key: 'sem_gluten', label: 'Sem Gluten' },
  { key: 'sem_lactose', label: 'Sem Lactose' },
] as const;

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenant = useAppSelector((state) => state.tenant.tenant);
  const isClosed = tenant ? !tenant.is_open : false;

  const { data: categories = [] } = useGetStorefrontCategoriesQuery(
    { slug: slug! },
    { skip: !slug },
  );
  const { data: products = [] } = useGetStorefrontProductsQuery(
    { slug: slug! },
    { skip: !slug },
  );

  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<string[]>([]);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Compute top 5 products by order_count for "Mais Pedido" badge
  const topProductIds = useMemo(() => {
    const sorted = [...products]
      .filter((p: any) => (p.order_count ?? 0) > 0)
      .sort((a: any, b: any) => (b.order_count ?? 0) - (a.order_count ?? 0))
      .slice(0, 5)
      .map((p: any) => p.id);
    return new Set(sorted);
  }, [products]);

  // Items for SmartSearch
  const searchItems = useMemo(
    () =>
      products
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          id: p.id,
          label: p.name,
          description: p.description || undefined,
          image: p.image_url || p.category?.image_url || undefined,
        })),
    [products],
  );

  // Popular items: first 5 active products (could be sorted by order count in the future)
  const popularItems = useMemo(
    () => searchItems.slice(0, 5),
    [searchItems],
  );

  const handleSmartSelect = useCallback(
    (item: { id: string; label: string }) => {
      navigate(`/${slug}/menu/${item.id}`);
    },
    [navigate, slug],
  );

  const handleSmartSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  const handleCategoryClick = (categoryId: string | null) => {
    setActiveCategory(categoryId);
    if (categoryId) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
  };

  const handleToggleDietaryFilter = (key: string) => {
    setActiveDietaryFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  const filteredProducts = products.filter((product: any) => {
    if (!product.is_active) return false;

    const matchesCategory = activeCategory
      ? product.category_id === activeCategory
      : true;

    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesDietary =
      activeDietaryFilters.length === 0
        ? true
        : activeDietaryFilters.every((tag) =>
            (product.dietary_tags ?? []).includes(tag),
          );

    return matchesCategory && matchesSearch && matchesDietary;
  });

  // Group products by category for display when no category filter is active
  const groupedProducts = !activeCategory
    ? categories
        .map((cat: any) => ({
          ...cat,
          items: filteredProducts.filter((p: any) => p.category_id === cat.id),
        }))
        .filter((group: any) => group.items.length > 0)
    : null;

  return (
    <div className="pb-6">
      {/* Search bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <SmartSearch
          items={searchItems}
          onSelect={handleSmartSelect}
          onSearch={handleSmartSearch}
          placeholder="Buscar no cardapio..."
          storageKey="menu-search-recent"
          popularItems={popularItems}
        />
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div
          ref={categoryScrollRef}
          className="sticky top-[7.75rem] z-20 bg-white border-b border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none"
        >
          <button
            onClick={() => handleCategoryClick(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !activeCategory
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={
              !activeCategory
                ? { background: 'var(--tenant-gradient)' }
                : {}
            }
          >
            Todos
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={
                activeCategory === cat.id
                  ? { background: 'var(--tenant-gradient)' }
                  : {}
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Dietary filter pills */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-none">
        {DIETARY_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => handleToggleDietaryFilter(filter.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              activeDietaryFilters.includes(filter.key)
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
            )}
            style={
              activeDietaryFilters.includes(filter.key)
                ? { background: 'var(--tenant-primary)' }
                : {}
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="px-4 pt-4">
        {activeCategory || searchQuery ? (
          // Flat list when filtered
          <div className="space-y-3">
            {filteredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug!}
                isClosed={isClosed}
                isTopProduct={topProductIds.has(product.id)}
              />
            ))}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-8">
            {groupedProducts?.map((group: any) => (
              <div key={group.id}>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {group.name}
                </h3>
                <div className="space-y-3">
                  {group.items.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      slug={slug!}
                      isClosed={isClosed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-1">
              Nenhum produto encontrado
            </p>
            <p className="text-gray-400 text-sm">
              Tente buscar por outro termo ou categoria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  slug,
  isClosed,
  isTopProduct,
}: {
  product: any;
  slug: string;
  isClosed: boolean;
  isTopProduct: boolean;
}) {
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(selectFavoriteIds);
  const isFavorited = favoriteIds.includes(product.id);

  const hasVariations = product.variations && product.variations.length > 0;

  const minPrice = hasVariations
    ? Math.min(...product.variations.map((v: any) => v.price))
    : product.base_price;

  const Wrapper = isClosed ? 'div' : Link;
  const wrapperProps = isClosed ? {} : { to: `/${slug}/menu/${product.id}` };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleFavorite(product.id));
  };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm flex group relative ${
        isClosed
          ? 'border-gray-200 cursor-not-allowed'
          : 'border-gray-100 hover:shadow-md transition-shadow'
      }`}
    >
      {/* Closed overlay */}
      {isClosed && (
        <div className="absolute inset-0 z-10 bg-gray-100/50 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-2 shadow-sm">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
      <div className={`flex-1 p-4 flex flex-col justify-between ${isClosed ? 'opacity-50' : ''}`}>
        <div>
          <div className="flex items-start gap-2">
            <h4 className="font-semibold text-gray-900 mb-1 flex-1">{product.name}</h4>
            <button
              onClick={handleFavoriteClick}
              className="shrink-0 p-1 -mt-0.5 -mr-1 rounded-full hover:bg-gray-100 transition-colors z-20 relative"
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-colors',
                  isFavorited
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-300 hover:text-red-400',
                )}
              />
            </button>
          </div>
          {isTopProduct && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 mb-1">
              <Flame className="w-3 h-3" />
              Mais Pedido
            </span>
          )}
          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-end justify-between mt-3">
          <p
            className="font-bold"
            style={{ color: isClosed ? '#9ca3af' : 'var(--tenant-primary)' }}
          >
            {hasVariations
              ? `A partir de ${formatPrice(minPrice)}`
              : formatPrice(minPrice)}
          </p>
        </div>
      </div>
      <div className={`w-28 h-28 flex-shrink-0 bg-gray-100 overflow-hidden ${isClosed ? 'grayscale opacity-60' : ''}`}>
        {(product.image_url || product.category?.image_url) ? (
          <img
            src={product.image_url || product.category?.image_url}
            alt={product.name}
            className={`w-full h-full object-cover ${isClosed ? '' : 'group-hover:scale-105'} transition-transform duration-300`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl text-white/70"
            style={{
              background: isClosed
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : `var(--tenant-gradient)`,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
