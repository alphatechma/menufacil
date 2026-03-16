import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  UserX,
  Truck,
  Store,
  UtensilsCrossed,
  CreditCard,
  Banknote,
  QrCode,
  Check,
  X,
} from 'lucide-react';
import { useGetProductsQuery, useGetCategoriesQuery, useGetCustomersQuery, useCreateAdminOrderMutation } from '@/api/adminApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import { PageHeader } from '@/components/ui/PageHeader';

interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  variation_id?: string;
  variation_name?: string;
  unit_price: number;
  quantity: number;
  extras: { name: string; price: number }[];
  notes?: string;
}

interface PaymentSplit {
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  amount: number;
}

const PAYMENT_METHODS = [
  { value: 'pix' as const, label: 'PIX', icon: QrCode },
  { value: 'credit_card' as const, label: 'Credito', icon: CreditCard },
  { value: 'debit_card' as const, label: 'Debito', icon: CreditCard },
  { value: 'cash' as const, label: 'Dinheiro', icon: Banknote },
];

const ORDER_TYPES = [
  { value: 'delivery', label: 'Delivery', icon: Truck },
  { value: 'pickup', label: 'Retirada', icon: Store },
  { value: 'dine_in', label: 'Mesa', icon: UtensilsCrossed },
];

export default function POS() {
  const navigate = useNavigate();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const [createOrder, { isLoading: creating }] = useCreateAdminOrderMutation();

  // Catalog state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState('pickup');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([{ method: 'cash', amount: 0 }]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (!p.is_available) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) || c.phone?.includes(q),
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return sum + (item.unit_price + extrasTotal) * item.quantity;
  }, 0);
  const total = subtotal;

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product_id === product.id && !item.variation_id,
      );
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          unit_price: Number(product.base_price),
          quantity: 1,
          extras: [],
        },
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePaymentSplit = (index: number, field: string, value: any) => {
    setPaymentSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const addPaymentSplit = () => {
    setPaymentSplits((prev) => [...prev, { method: 'cash', amount: 0 }]);
  };

  const removePaymentSplit = (index: number) => {
    if (paymentSplits.length <= 1) return;
    setPaymentSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    const data: any = {
      items: cart.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
        notes: item.notes || undefined,
        extras: item.extras.length > 0 ? item.extras : undefined,
      })),
      order_type: orderType,
      is_paid: isPaid,
      notes: notes || undefined,
    };

    if (selectedCustomer) {
      data.customer_id = selectedCustomer.id;
      data.customer_name = selectedCustomer.name;
    }

    // Payment
    if (paymentSplits.length === 1) {
      data.payment_method = paymentSplits[0].method;
      if (paymentSplits[0].method === 'cash' && changeFor) {
        data.change_for = parseFloat(changeFor);
      }
    } else {
      data.payment_splits = paymentSplits.map((s) => ({
        method: s.method,
        amount: s.amount || total / paymentSplits.length,
      }));
      data.payment_method = paymentSplits[0].method;
    }

    try {
      const order = await createOrder(data).unwrap();
      setOrderSuccess(order.order_number);
      // Reset
      setCart([]);
      setSelectedCustomer(null);
      setNotes('');
      setChangeFor('');
      setPaymentSplits([{ method: 'cash', amount: 0 }]);
      setTimeout(() => setOrderSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader title="PDV" subtitle="Ponto de Venda" />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product Catalog */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Search + Category filter */}
          <div className="p-4 space-y-3 border-b border-border">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                  !selectedCategory
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                Todos
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary hover:shadow-md transition-all active:scale-95"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-sm font-bold text-primary">{formatPrice(product.base_price)}</p>
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart / Order Summary */}
        <div className="w-96 flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Order Success */}
            {orderSuccess && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-200">Pedido #{orderSuccess} criado!</p>
                  <button
                    onClick={() => navigate(`/admin/orders`)}
                    className="text-xs text-green-600 underline"
                  >
                    Ver pedidos
                  </button>
                </div>
              </div>
            )}

            {/* Order Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tipo do pedido</p>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setOrderType(type.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-medium transition-all',
                      orderType === type.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cliente</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : showCustomerSearch ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar por nome ou telefone..."
                      className="text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => { setShowCustomerSearch(false); setCustomerSearch(''); }}
                      className="text-muted-foreground hover:text-foreground p-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {filteredCustomers.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerSearch(false);
                          setCustomerSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum cliente encontrado</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomerSearch(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Search className="w-4 h-4" /> Buscar cliente
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    title="Cliente nao identificado"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Itens ({cart.length})
              </p>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Carrinho vazio</p>
                  <p className="text-xs">Clique em um produto para adicionar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div key={`${item.product_id}-${index}`} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                        {item.variation_name && (
                          <p className="text-xs text-muted-foreground">{item.variation_name}</p>
                        )}
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="w-7 h-7 rounded-lg border border-primary text-primary flex items-center justify-center hover:bg-primary/5 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="w-7 h-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center transition-colors ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {cart.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Observacao</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observacoes do pedido..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Payment */}
            {cart.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Pagamento</p>
                  {paymentSplits.length < 4 && (
                    <button
                      onClick={addPaymentSplit}
                      className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Dividir
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {paymentSplits.map((split, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={split.method}
                        onChange={(e) => updatePaymentSplit(index, 'method', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      {paymentSplits.length > 1 && (
                        <>
                          <Input
                            type="number"
                            value={split.amount || ''}
                            onChange={(e) => updatePaymentSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="Valor"
                            className="w-24 text-sm"
                          />
                          <button
                            onClick={() => removePaymentSplit(index)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Change for cash */}
                {paymentSplits.some((s) => s.method === 'cash') && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      placeholder="Troco para (R$)..."
                      className="text-sm"
                    />
                    {changeFor && parseFloat(changeFor) > total && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Troco: {formatPrice(parseFloat(changeFor) - total)}
                      </p>
                    )}
                  </div>
                )}

                {/* Already paid toggle */}
                <div className="flex items-center justify-between mt-3 py-2">
                  <p className="text-sm font-medium text-foreground">Ja pago</p>
                  <button
                    onClick={() => setIsPaid(!isPaid)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      isPaid ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                        isPaid ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer: Totals + Submit */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
              </div>
              <Button
                onClick={handleSubmit}
                loading={creating}
                disabled={cart.length === 0}
                className="w-full"
                size="lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Finalizar Pedido
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
