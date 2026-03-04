import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, X, Plus, Minus } from 'lucide-react';
import { useTenantStore } from '../store/tenantStore';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types';

export function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, products, fetchProducts } = useTenantStore();

  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
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

  const filteredProducts = products.filter((product) => {
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

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Group products by category for display when no category filter is active
  const groupedProducts = !activeCategory
    ? categories
        .map((cat) => ({
          ...cat,
          items: filteredProducts.filter((p) => p.category_id === cat.id),
        }))
        .filter((group) => group.items.length > 0)
    : null;

  return (
    <div className="pb-6">
      {/* Search bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar no cardapio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-10"
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
          {categories.map((cat) => (
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
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug!}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-8">
            {groupedProducts?.map((group) => (
              <div key={group.id}>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {group.name}
                </h3>
                <div className="space-y-3">
                  {group.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      slug={slug!}
                      formatPrice={formatPrice}
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
  formatPrice,
}: {
  product: Product;
  slug: string;
  formatPrice: (price: number) => string;
}) {
  const { items, addItem, updateQuantity } = useCartStore();
  const hasVariations = product.variations.length > 0;
  const hasExtras = product.extra_groups.length > 0;
  const isSimple = !hasVariations && !hasExtras;

  // Find quantity of this simple product in cart
  const cartIndex = isSimple
    ? items.findIndex(
        (item) =>
          item.product_id === product.id &&
          !item.variation_id &&
          item.extras.length === 0,
      )
    : -1;
  const cartQty = cartIndex >= 0 ? items[cartIndex].quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variation_id: null,
      variation_name: null,
      unit_price: product.base_price,
      quantity: 1,
      extras: [],
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartIndex >= 0) {
      updateQuantity(cartIndex, cartQty - 1);
    }
  };

  const minPrice =
    hasVariations
      ? Math.min(...product.variations.map((v) => v.price))
      : product.base_price;

  const cardContent = (
    <>
      <div className="flex-1 p-4 flex flex-col justify-between">
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
            style={{ color: 'var(--tenant-primary)' }}
          >
            {hasVariations
              ? `A partir de ${formatPrice(minPrice)}`
              : formatPrice(minPrice)}
          </p>

          {/* +/- buttons for simple products */}
          {isSimple && (
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
              {cartQty > 0 ? (
                <>
                  <button
                    onClick={handleRemove}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={{ borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-900">
                    {cartQty}
                  </span>
                  <button
                    onClick={handleAdd}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAdd}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                  style={{ backgroundColor: 'var(--tenant-primary)' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="w-28 h-28 flex-shrink-0 bg-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl text-white/70"
            style={{
              background: `linear-gradient(135deg, var(--tenant-primary-light), var(--tenant-primary))`,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
      </div>
    </>
  );

  // Simple products: card is still clickable but +/- work independently
  return (
    <Link
      to={`/${slug}/menu/${product.id}`}
      className="card flex overflow-hidden group"
    >
      {cardContent}
    </Link>
  );
}
