import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Loader2, X, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';

interface Category {
  id: string;
  name: string;
}

interface Variation {
  id: string;
  name: string;
  price: number;
}

interface Extra {
  id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  category_id: string;
  variations?: Variation[];
  extras?: Extra[];
}

interface OrderItem {
  product_id: string;
  product_name: string;
  variation_id?: string;
  variation_name?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  extras: { extra_id: string; name: string; price: number }[];
}

export default function NewOrder() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [noteProductId, setNoteProductId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    Promise.all([api.get('/products'), api.get('/categories')])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data.data || prodRes.data);
        setCategories(catRes.data.data || catRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, search]);

  const findItem = (productId: string, variationId?: string) =>
    items.find(
      (i) => i.product_id === productId && i.variation_id === variationId,
    );

  const addItem = (product: Product, variation?: Variation) => {
    const existing = findItem(product.id, variation?.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product_id === product.id && i.variation_id === variation?.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          variation_id: variation?.id,
          variation_name: variation?.name,
          quantity: 1,
          unit_price: variation?.price ?? product.base_price,
          extras: [],
        },
      ]);
    }
  };

  const removeItem = (productId: string, variationId?: string) => {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.product_id === productId && i.variation_id === variationId
          ? { ...i, quantity: i.quantity - 1 }
          : i,
      );
      return updated.filter((i) => i.quantity > 0);
    });
  };

  const toggleExtra = (productId: string, variationId: string | undefined, extra: Extra) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId || i.variation_id !== variationId) return i;
        const has = i.extras.some((e) => e.extra_id === extra.id);
        return {
          ...i,
          extras: has
            ? i.extras.filter((e) => e.extra_id !== extra.id)
            : [...i.extras, { extra_id: extra.id, name: extra.name, price: extra.price }],
        };
      }),
    );
  };

  const saveNote = () => {
    if (!noteProductId) return;
    setItems((prev) =>
      prev.map((i) => (i.product_id === noteProductId ? { ...i, notes: noteText || undefined } : i)),
    );
    setNoteProductId(null);
    setNoteText('');
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price + i.extras.reduce((es, e) => es + e.price * i.quantity, 0),
    0,
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSend = async () => {
    if (items.length === 0 || !tableId) return;
    setSending(true);
    try {
      // Ensure active session
      let sessionRes = await api.get(`/table-sessions/active/${tableId}`).catch(() => ({ data: null }));
      if (!sessionRes.data) {
        sessionRes = await api.post('/table-sessions/open', { table_id: tableId });
      }
      const sessionId = sessionRes.data.id;

      await api.post('/orders', {
        items: items.map((i) => ({
          product_id: i.product_id,
          variation_id: i.variation_id || undefined,
          quantity: i.quantity,
          notes: i.notes || undefined,
          extras: i.extras.map((e) => ({ extra_id: e.extra_id })),
        })),
        order_type: 'dine_in',
        table_id: tableId,
        table_session_id: sessionId,
      });

      navigate(`/tables/${tableId}`, { replace: true });
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky Top: Header + Search + Categories */}
      <div className="sticky top-0 z-10 bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1 active:scale-95">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Novo Pedido</h1>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 py-2 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-gray-100">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              !selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                cat.id === selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 space-y-2">
        {filtered.map((product) => {
          const hasVariations = product.variations && product.variations.length > 0;
          const hasExtras = product.extras && product.extras.length > 0;
          const item = findItem(product.id);
          const qty = item?.quantity || 0;

          return (
            <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400 truncate">{product.description}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    {formatCurrency(product.base_price)}
                  </p>
                </div>

                {!hasVariations && (
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => addItem(product)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Variations */}
              {hasVariations && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.variations!.map((v) => {
                    const vItem = findItem(product.id, v.id);
                    const vQty = vItem?.quantity || 0;
                    return (
                      <div key={v.id} className="flex items-center gap-1">
                        <button
                          onClick={() => addItem(product, v)}
                          className={cn(
                            'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                            vQty > 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {v.name} {formatCurrency(v.price)}
                          {vQty > 0 && ` (${vQty})`}
                        </button>
                        {vQty > 0 && (
                          <button
                            onClick={() => removeItem(product.id, v.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extras (only show if item is in order) */}
              {hasExtras && (qty > 0 || items.some((i) => i.product_id === product.id)) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.extras!.map((extra) => {
                    const activeItem = items.find((i) => i.product_id === product.id);
                    const isSelected = activeItem?.extras.some((e) => e.extra_id === extra.id);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => toggleExtra(product.id, activeItem?.variation_id, extra)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary-50 text-primary'
                            : 'border-gray-200 text-gray-500',
                        )}
                      >
                        + {extra.name} ({formatCurrency(extra.price)})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Notes button */}
              {qty > 0 && (
                <button
                  onClick={() => {
                    setNoteProductId(product.id);
                    setNoteText(item?.notes || '');
                  }}
                  className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
                >
                  <MessageSquare className="w-3 h-3" />
                  {item?.notes ? 'Editar obs.' : 'Adicionar obs.'}
                </button>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">Nenhum produto encontrado</div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{totalItems} itens</span>
                <span>Enviar Pedido</span>
                <span className="font-bold">{formatCurrency(totalPrice)}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Notes Modal */}
      {noteProductId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Observacao do item</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: sem cebola, bem passado..."
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setNoteProductId(null); setNoteText(''); }}
                className="flex-1 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-300 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={saveNote}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl active:scale-95"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
