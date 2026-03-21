import { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useUpdateProductMutation,
} from '@/api/api';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';

export default function Menu() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingPrice, setEditingPrice] = useState<{ id: string; price: string } | null>(null);

  const { data: products = [], isLoading: loadingProducts, refetch } = useGetProductsQuery();
  const { data: categories = [], isLoading: loadingCategories } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const lower = search.toLowerCase();
    return products.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(lower) ||
        p.category?.name?.toLowerCase().includes(lower),
    );
  }, [products, search]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, { category: any; products: any[] }>();

    for (const cat of categories) {
      map.set(cat.id, { category: cat, products: [] });
    }

    for (const p of filteredProducts) {
      const catId = p.category_id || p.category?.id;
      if (catId && map.has(catId)) {
        map.get(catId)!.products.push(p);
      } else {
        if (!map.has('uncategorized')) {
          map.set('uncategorized', { category: { id: 'uncategorized', name: 'Sem Categoria' }, products: [] });
        }
        map.get('uncategorized')!.products.push(p);
      }
    }

    return Array.from(map.values()).filter((g) => g.products.length > 0);
  }, [filteredProducts, categories]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(groupedByCategory.map((g) => g.category.id)));
  };

  const handleToggleActive = async (product: any) => {
    await updateProduct({ id: product.id, data: { is_active: !product.is_active } }).catch(() => {});
  };

  const handleStartEditPrice = (product: any) => {
    const currentPrice = typeof product.price === 'number' ? product.price.toFixed(2) : '0.00';
    setEditingPrice({ id: product.id, price: currentPrice });
  };

  const handleSavePrice = async () => {
    if (!editingPrice) return;
    const price = parseFloat(editingPrice.price.replace(',', '.'));
    if (isNaN(price) || price < 0) return;
    await updateProduct({ id: editingPrice.id, data: { price } }).catch(() => {});
    setEditingPrice(null);
  };

  const handleCancelEditPrice = () => {
    setEditingPrice(null);
  };

  if (loadingProducts || loadingCategories) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Cardapio</h1>
          <span className="text-sm text-gray-500">
            {products.length} produto(s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            Expandir Todos
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produto ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Category groups */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {groupedByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-gray-400">
            <Package className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
          </div>
        ) : (
          groupedByCategory.map(({ category, products: catProducts }) => {
            const isExpanded = expandedCategories.has(category.id);
            const activeCount = catProducts.filter((p: any) => p.is_active !== false).length;

            return (
              <div key={category.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-bold text-gray-900">{category.name}</span>
                    <span className="text-xs text-gray-500">
                      {activeCount}/{catProducts.length} ativos
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {catProducts.length} produto(s)
                  </span>
                </button>

                {/* Products list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {catProducts.map((product: any) => {
                      const isActive = product.is_active !== false;
                      const isEditingThis = editingPrice?.id === product.id;

                      return (
                        <div
                          key={product.id}
                          className={cn(
                            'flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0',
                            !isActive && 'opacity-50',
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Product image thumbnail */}
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {product.name}
                              </p>
                              {product.description && (
                                <p className="text-xs text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Price */}
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-500">R$</span>
                                <input
                                  type="text"
                                  value={editingPrice!.price}
                                  onChange={(e) =>
                                    setEditingPrice({ id: editingPrice!.id, price: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePrice();
                                    if (e.key === 'Escape') handleCancelEditPrice();
                                  }}
                                  autoFocus
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                <button
                                  onClick={handleSavePrice}
                                  disabled={isUpdating}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditPrice}
                                  className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditPrice(product)}
                                className="flex items-center gap-1 text-sm font-bold text-gray-900 hover:text-orange-600 transition-colors group"
                              >
                                {formatPrice(product.price || 0)}
                                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )}

                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleActive(product)}
                              disabled={isUpdating}
                              className="transition-colors disabled:opacity-50"
                              title={isActive ? 'Desativar produto' : 'Ativar produto'}
                            >
                              {isActive ? (
                                <ToggleRight className="w-7 h-7 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-gray-300" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
