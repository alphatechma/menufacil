import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, X, Lock } from 'lucide-react';
import { useGetStorefrontProductsQuery, useGetStorefrontCategoriesQuery } from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';

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

  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

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

  const filteredProducts = products.filter((product: any) => {
    if (!product.is_active) return false;

    const matchesCategory = activeCategory
      ? product.category_id === activeCategory
      : true;

    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesCategory && matchesSearch;
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
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar no cardapio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
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
                ? { backgroundColor: 'var(--tenant-primary)' }
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
                  ? { backgroundColor: 'var(--tenant-primary)' }
                  : {}
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
}: {
  product: any;
  slug: string;
  isClosed: boolean;
}) {
  const hasVariations = product.variations && product.variations.length > 0;

  const minPrice = hasVariations
    ? Math.min(...product.variations.map((v: any) => v.price))
    : product.base_price;

  const Wrapper = isClosed ? 'div' : Link;
  const wrapperProps = isClosed ? {} : { to: `/${slug}/menu/${product.id}` };

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
          <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
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
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover ${isClosed ? '' : 'group-hover:scale-105'} transition-transform duration-300`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl text-white/70"
            style={{
              background: isClosed
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : `linear-gradient(135deg, var(--tenant-primary-light), var(--tenant-primary))`,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
