import { Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';

interface ProductGridProps {
  products: any[];
  categories: any[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  onProductClick: (product: any) => void;
  cartQuantityByProduct: Record<string, number>;
  addedProductId: string | null;
}

export default function ProductGrid({
  products,
  categories,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onProductClick,
  cartQuantityByProduct,
  addedProductId,
}: ProductGridProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search + Category Tabs */}
      <div className="p-4 space-y-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all active:scale-95',
              !selectedCategory
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all active:scale-95',
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {products.map((product: any) => {
            const hasOptions =
              product.variations?.length > 0 ||
              product.extra_groups?.some((g: any) => g.extras?.length > 0);
            const inCart = cartQuantityByProduct[product.id] || 0;
            const justAdded = addedProductId === product.id;

            return (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className={cn(
                  'relative flex flex-col bg-white border rounded-2xl p-3 text-left transition-all active:scale-[0.97] min-h-[140px]',
                  justAdded && 'ring-2 ring-primary ring-offset-2 animate-pulse',
                  inCart > 0
                    ? 'border-primary shadow-md hover:shadow-lg'
                    : 'border-gray-100 hover:border-primary/40 hover:shadow-lg',
                )}
              >
                {/* Quantity badge */}
                {inCart > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg z-10">
                    {inCart}
                  </span>
                )}

                {/* Options indicator */}
                {hasOptions && !inCart && (
                  <span className="absolute top-2.5 right-2.5 bg-primary-50 text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">
                    Opções
                  </span>
                )}

                {/* Product Image */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full aspect-[4/3] object-cover rounded-xl mb-2.5"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-50 rounded-xl mb-2.5 flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-gray-200" />
                  </div>
                )}

                {/* Product Info */}
                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
                  {product.name}
                </p>
                <p className="text-base font-bold text-primary mt-auto">
                  {formatPrice(product.base_price)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Nenhum produto encontrado</p>
            <p className="text-sm mt-1">Tente buscar com outros termos</p>
          </div>
        )}
      </div>
    </div>
  );
}
