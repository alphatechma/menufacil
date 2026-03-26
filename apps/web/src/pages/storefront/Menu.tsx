import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Flame, Heart, Tag, Percent, Clock, Gift, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGetStorefrontProductsQuery, useGetStorefrontCategoriesQuery, useGetActivePromotionsQuery } from '@/api/customerApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleFavorite, selectFavoriteIds } from '@/store/slices/favoritesSlice';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';
import { SmartSearch } from '@/components/ui/SmartSearch';

const DIETARY_FILTERS = [
  { key: 'vegetariano', label: 'Vegetariano', emoji: '🥬' },
  { key: 'vegano', label: 'Vegano', emoji: '🌱' },
  { key: 'sem_gluten', label: 'Sem Gluten', emoji: '🚫' },
  { key: 'sem_lactose', label: 'Sem Lactose', emoji: '🥛' },
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

  const { data: activePromotions = [] } = useGetActivePromotionsQuery(
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
  const categorySectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const promoScrollRef = useRef<HTMLDivElement>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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

  // Popular items: first 5 active products
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
      // Smooth scroll to category section when in grouped mode
      const section = categorySectionRefs.current.get(categoryId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setSearchParams({});
    }

    // Scroll the active category pill into view
    if (categoryScrollRef.current) {
      const activeButton = categoryScrollRef.current.querySelector('[data-active="true"]');
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
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

  // Build a map of productId -> promotion labels for badges on products
  const productPromoBadges = useMemo(() => {
    const badges: Record<string, string> = {};
    for (const promo of activePromotions) {
      const productIds = promo.rules?.products || [];
      const categoryIds = promo.rules?.categories || [];
      const label =
        promo.type === 'happy_hour'
          ? `Happy Hour -${promo.discount_type === 'percent' ? `${promo.discount_value}%` : `R$${Number(promo.discount_value).toFixed(2)}`}`
          : promo.type === 'combo'
            ? `Combo: ${promo.name}`
            : promo.type === 'buy_x_get_y'
              ? `Compre ${promo.rules?.buy_quantity || ''} Leve ${(promo.rules?.buy_quantity || 0) + (promo.rules?.get_quantity || 0)}`
              : `-${promo.discount_type === 'percent' ? `${promo.discount_value}%` : `R$${Number(promo.discount_value).toFixed(2)}`}`;

      for (const pid of productIds) {
        badges[pid] = label;
      }
      // Also match by category
      for (const cid of categoryIds) {
        for (const p of products) {
          if ((p as any).category_id === cid && !badges[(p as any).id]) {
            badges[(p as any).id] = label;
          }
        }
      }
    }
    return badges;
  }, [activePromotions, products]);

  // Group products by category for display when no category filter is active
  const groupedProducts = !activeCategory
    ? categories
        .map((cat: any) => ({
          ...cat,
          items: filteredProducts.filter((p: any) => p.category_id === cat.id),
        }))
        .filter((group: any) => group.items.length > 0)
    : null;

  // Count products per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if ((p as any).is_active) {
        const catId = (p as any).category_id;
        counts[catId] = (counts[catId] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  // Auto-scroll promotions
  useEffect(() => {
    if (activePromotions.length <= 1) return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % activePromotions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activePromotions.length]);

  // Scroll promo carousel to current index
  useEffect(() => {
    if (promoScrollRef.current) {
      const container = promoScrollRef.current;
      const child = container.children[promoIndex] as HTMLElement;
      if (child) {
        container.scrollTo({ left: child.offsetLeft - 16, behavior: 'smooth' });
      }
    }
  }, [promoIndex]);

  const scrollPromo = (direction: 'left' | 'right') => {
    setPromoIndex((prev) => {
      if (direction === 'left') return prev > 0 ? prev - 1 : activePromotions.length - 1;
      return prev < activePromotions.length - 1 ? prev + 1 : 0;
    });
  };

  return (
    <div className="pb-24 scroll-smooth">
      {/* Sticky header with search + categories + glass effect */}
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100/80">
        {/* Search bar */}
        <div className="px-4 py-3">
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
            className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory"
          >
            <button
              onClick={() => handleCategoryClick(null)}
              data-active={!activeCategory}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 snap-start flex items-center gap-1.5',
                !activeCategory
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95',
              )}
              style={
                !activeCategory
                  ? { backgroundColor: 'var(--tenant-primary)', boxShadow: '0 4px 12px color-mix(in srgb, var(--tenant-primary) 40%, transparent)' }
                  : {}
              }
            >
              Todos
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  !activeCategory
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-200 text-gray-500',
                )}
              >
                {products.filter((p: any) => p.is_active).length}
              </span>
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                data-active={activeCategory === cat.id}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 snap-start flex items-center gap-1.5',
                  activeCategory === cat.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95',
                )}
                style={
                  activeCategory === cat.id
                    ? { backgroundColor: 'var(--tenant-primary)', boxShadow: '0 4px 12px color-mix(in srgb, var(--tenant-primary) 40%, transparent)' }
                    : {}
                }
              >
                {cat.name}
                {categoryCounts[cat.id] > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                      activeCategory === cat.id
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-200 text-gray-500',
                    )}
                  >
                    {categoryCounts[cat.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dietary filter pills */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-none">
        {DIETARY_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => handleToggleDietaryFilter(filter.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 active:scale-95',
              activeDietaryFilters.includes(filter.key)
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
            )}
            style={
              activeDietaryFilters.includes(filter.key)
                ? { backgroundColor: 'var(--tenant-primary)' }
                : {}
            }
          >
            <span className="text-sm leading-none">{filter.emoji}</span>
            {filter.label}
          </button>
        ))}
      </div>

      {/* Active Promotions */}
      {activePromotions.length > 0 && (
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
              Promocoes
            </h3>
            {activePromotions.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollPromo('left')}
                  className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => scrollPromo('right')}
                  className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-90"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {/* Promo carousel with gradient fade */}
          <div className="relative">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[hsl(var(--background))] to-transparent z-10 pointer-events-none rounded-l-xl" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[hsl(var(--background))] to-transparent z-10 pointer-events-none rounded-r-xl" />

            <div
              ref={promoScrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-none pb-1 scroll-smooth"
            >
              {activePromotions.map((promo: any, idx: number) => (
                <div
                  key={promo.id}
                  className={cn(
                    'flex-shrink-0 w-64 rounded-2xl p-4 border-0 shadow-sm transition-all duration-300',
                    idx === promoIndex ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-80',
                  )}
                  style={{
                    background: `linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                      {promo.type === 'happy_hour' && <Clock className="w-4 h-4 text-white" />}
                      {promo.type === 'combo' && <Gift className="w-4 h-4 text-white" />}
                      {promo.type === 'buy_x_get_y' && <Gift className="w-4 h-4 text-white" />}
                      {(promo.type === 'discount' || promo.type === 'weekday') && <Percent className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                      {promo.type === 'happy_hour' ? 'Happy Hour' :
                       promo.type === 'combo' ? 'Combo' :
                       promo.type === 'buy_x_get_y' ? 'Compre e Leve' :
                       promo.type === 'weekday' ? 'Promo do Dia' : 'Desconto'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">{promo.name}</p>
                  <p className="text-lg font-extrabold text-white mt-1">
                    {promo.discount_type === 'percent'
                      ? `-${promo.discount_value}%`
                      : `-R$ ${Number(promo.discount_value).toFixed(2)}`}
                  </p>
                  {promo.description && (
                    <p className="text-xs text-white/70 mt-1 line-clamp-1">{promo.description}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Scroll dots */}
            {activePromotions.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {activePromotions.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setPromoIndex(idx)}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      idx === promoIndex
                        ? 'w-5 h-1.5'
                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400',
                    )}
                    style={idx === promoIndex ? { backgroundColor: 'var(--tenant-primary)' } : {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="px-4 pt-5">
        {activeCategory || searchQuery ? (
          // Flat list when filtered
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredProducts.map((product: any, idx: number) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug!}
                isClosed={isClosed}
                isTopProduct={topProductIds.has(product.id)}
                promoBadge={productPromoBadges[product.id]}
                index={idx}
                isVisible={isVisible}
              />
            ))}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-8">
            {groupedProducts?.map((group: any) => (
              <div
                key={group.id}
                ref={(el) => {
                  if (el) categorySectionRefs.current.set(group.id, el);
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {group.name}
                  </h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {group.items.map((product: any, idx: number) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      slug={slug!}
                      isClosed={isClosed}
                      isTopProduct={topProductIds.has(product.id)}
                      promoBadge={productPromoBadges[product.id]}
                      index={idx}
                      isVisible={isVisible}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-base font-semibold text-gray-500">Nenhum produto encontrado</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">Tente buscar por outro termo ou categoria</p>
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
  promoBadge,
  index,
  isVisible,
}: {
  product: any;
  slug: string;
  isClosed: boolean;
  isTopProduct?: boolean;
  promoBadge?: string;
  index: number;
  isVisible: boolean;
}) {
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(selectFavoriteIds);
  const isFavorited = favoriteIds.includes(product.id);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const hasVariations = product.variations && product.variations.length > 0;

  const minPrice = hasVariations
    ? Math.min(...product.variations.map((v: any) => v.price))
    : product.base_price;

  const Wrapper = isClosed ? 'div' : Link;
  const wrapperProps = isClosed ? {} : { to: `/${slug}/menu/${product.id}` };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeartAnimating(true);
    dispatch(toggleFavorite(product.id));
    setTimeout(() => setHeartAnimating(false), 400);
  };

  // Dietary tag dots
  const dietaryDots = useMemo(() => {
    const tags = product.dietary_tags ?? [];
    const dotMap: Record<string, string> = {
      vegetariano: '#22c55e',
      vegano: '#16a34a',
      sem_gluten: '#f59e0b',
      sem_lactose: '#3b82f6',
    };
    return tags
      .filter((t: string) => dotMap[t])
      .map((t: string) => ({ key: t, color: dotMap[t] }));
  }, [product.dietary_tags]);

  // Staggered fade-in delay
  const animationDelay = `${Math.min(index * 60, 400)}ms`;

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'bg-white rounded-2xl border overflow-hidden shadow-sm flex flex-col group relative transition-all duration-300',
        isClosed
          ? 'border-gray-200 cursor-not-allowed'
          : 'border-gray-100 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
      style={{ transitionDelay: animationDelay }}
    >
      {/* Closed overlay */}
      {isClosed && (
        <div className="absolute inset-0 z-10 bg-gray-100/50 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-2 shadow-sm">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Image area */}
      <div className={cn(
        'relative aspect-[4/3] w-full bg-gray-100 overflow-hidden',
        isClosed ? 'grayscale opacity-60' : '',
      )}>
        {(product.image_url || product.category?.image_url) ? (
          <img
            src={product.image_url || product.category?.image_url}
            alt={product.name}
            className={cn(
              'w-full h-full object-cover transition-transform duration-500',
              isClosed ? '' : 'group-hover:scale-110',
            )}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl text-white/70"
            style={{
              background: isClosed
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : 'linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))',
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}

        {/* Favorite heart - top right */}
        <button
          onClick={handleFavoriteClick}
          className={cn(
            'absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 z-20',
            'hover:bg-white hover:shadow-md active:scale-90',
            heartAnimating && 'scale-125',
          )}
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-all duration-300',
              isFavorited
                ? 'fill-red-500 text-red-500'
                : 'text-gray-400',
              heartAnimating && 'scale-110',
            )}
          />
        </button>

        {/* Badges overlay - top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {isTopProduct && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
              }}
            >
              <Flame className="w-3 h-3" />
              Mais Pedido
            </span>
          )}
          {promoBadge && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm backdrop-blur-sm"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              <Tag className="w-3 h-3" />
              {promoBadge}
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className={cn(
        'flex-1 p-3 flex flex-col justify-between',
        isClosed ? 'opacity-50' : '',
      )}>
        <div>
          <div className="flex items-start gap-1">
            <h4 className="text-base font-bold text-gray-900 leading-tight flex-1 line-clamp-1">
              {product.name}
            </h4>
            {/* Dietary dots */}
            {dietaryDots.length > 0 && (
              <div className="flex items-center gap-1 mt-1 shrink-0">
                {dietaryDots.map((dot: { key: string; color: string }) => (
                  <span
                    key={dot.key}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dot.color }}
                    title={dot.key}
                  />
                ))}
              </div>
            )}
          </div>
          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between mt-3">
          <div>
            {hasVariations && (
              <span className="text-[10px] text-gray-400 font-medium block">A partir de</span>
            )}
            <p
              className="text-lg font-extrabold leading-tight"
              style={{ color: isClosed ? '#9ca3af' : 'var(--tenant-primary)' }}
            >
              {formatPrice(minPrice)}
            </p>
          </div>

          {!isClosed && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Navigate to product detail for adding to cart
                if (!isClosed) {
                  window.location.href = `/${slug}/menu/${product.id}`;
                }
              }}
              className="p-2 rounded-xl text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-90"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
              aria-label="Ver produto"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
