import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  UserPlus,
  UserX,
  Truck,
  Store,
  UtensilsCrossed,
  CreditCard,
  Banknote,
  QrCode,
  Check,
  X,
  DollarSign,
  Lock,
  Unlock,
} from 'lucide-react';
import { useGetProductsQuery, useGetCategoriesQuery, useGetCustomersQuery, useCreateAdminOrderMutation, useCreateCustomerMutation, useGetCashRegisterQuery, useOpenCashRegisterMutation, useCloseCashRegisterMutation } from '@/api/adminApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
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

// Product detail modal — mirrors storefront ProductDetail logic
function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: any;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const hasVariations = product.variations && product.variations.length > 0;
  const minVariations = product.min_variations ?? 0;
  const maxVariations = product.max_variations ?? 0;
  const isMultiSelect = maxVariations > 1;
  const isRequired = minVariations > 0;

  const [selectedVariations, setSelectedVariations] = useState<Map<string, number>>(() => {
    if (hasVariations && !isMultiSelect && isRequired) {
      return new Map([[product.variations[0].id, 1]]);
    }
    return new Map();
  });
  const [selectedExtras, setSelectedExtras] = useState<Map<string, { name: string; price: number }>>(new Map());
  const [qty, setQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const totalSelectedParts = Array.from(selectedVariations.values()).reduce((a, b) => a + b, 0);

  // Toggle variation — same logic as storefront
  const toggleVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      if (!isMultiSelect) {
        if (next.has(variationId) && !isRequired) {
          next.clear();
        } else {
          next.clear();
          next.set(variationId, 1);
        }
      } else {
        if (next.has(variationId)) {
          next.delete(variationId);
        } else if (maxVariations === 0 || totalSelectedParts < maxVariations) {
          next.set(variationId, 1);
        }
      }
      return next;
    });
  };

  const incrementVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      const current = next.get(variationId) || 0;
      const total = Array.from(next.values()).reduce((a, b) => a + b, 0);
      if (maxVariations > 0 && total >= maxVariations) return prev;
      next.set(variationId, current + 1);
      return next;
    });
  };

  const decrementVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      const current = next.get(variationId) || 0;
      if (current <= 1) {
        next.delete(variationId);
      } else {
        next.set(variationId, current - 1);
      }
      return next;
    });
  };

  const toggleExtra = (extra: any, group: any) => {
    setSelectedExtras((prev) => {
      const next = new Map(prev);
      if (next.has(extra.id)) {
        next.delete(extra.id);
      } else {
        // Check max_select for this group
        const selectedInGroup = group.extras.filter((e: any) => next.has(e.id)).length;
        if (group.max_select && selectedInGroup >= group.max_select) return prev;
        next.set(extra.id, { name: extra.name, price: Number(extra.price) });
      }
      return next;
    });
  };

  // Calculate price — same as storefront
  const getBasePrice = () => {
    if (selectedVariations.size === 0) return Number(product.base_price);
    if (isMultiSelect && totalSelectedParts > 0) {
      let weightedSum = 0;
      for (const [varId, varQty] of selectedVariations) {
        const variation = product.variations?.find((v: any) => v.id === varId);
        if (variation) weightedSum += Number(variation.price) * varQty;
      }
      return weightedSum / totalSelectedParts;
    }
    const selected = product.variations?.find((v: any) => selectedVariations.has(v.id));
    return selected ? Number(selected.price) : Number(product.base_price);
  };

  const unitPrice = getBasePrice();
  const extrasTotal = Array.from(selectedExtras.values()).reduce((s, e) => s + e.price, 0);
  const totalPrice = (unitPrice + extrasTotal) * qty;

  // Validation — same as storefront
  const validate = (): string[] => {
    const errs: string[] = [];
    if (hasVariations && isRequired) {
      if (!isMultiSelect && selectedVariations.size === 0) {
        errs.push('Selecione uma opcao');
      } else if (isMultiSelect && totalSelectedParts < minVariations) {
        errs.push(`Selecione pelo menos ${minVariations} ${minVariations === 1 ? 'parte' : 'partes'}`);
      }
    }
    if (product.extra_groups) {
      for (const group of product.extra_groups) {
        if (group.is_required) {
          const selectedInGroup = group.extras.filter((e: any) => selectedExtras.has(e.id)).length;
          if (selectedInGroup < (group.min_select || 1)) {
            errs.push(`Selecione pelo menos ${group.min_select || 1} item em "${group.name}"`);
          }
        }
      }
    }
    return errs;
  };

  const handleAdd = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const selected = product.variations?.filter((v: any) => selectedVariations.has(v.id)) || [];
    const variationId = selected[0]?.id || undefined;
    let variationName: string | undefined;
    if (isMultiSelect && totalSelectedParts > 0) {
      variationName = selected
        .map((v: any) => {
          const vQty = selectedVariations.get(v.id) || 1;
          return `${vQty}/${totalSelectedParts} ${v.name}`;
        })
        .join(' / ');
    } else {
      variationName = selected.map((v: any) => v.name).join(' / ') || undefined;
    }

    onAdd({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variation_id: variationId,
      variation_name: variationName,
      unit_price: unitPrice,
      quantity: qty,
      extras: Array.from(selectedExtras.values()),
      notes: itemNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={product.name} className="md:max-w-md">
      <div className="space-y-4">
        {/* Variations */}
        {hasVariations && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-foreground">
                {isMultiSelect ? 'Escolha suas opcoes' : 'Escolha uma opcao'}
              </p>
              {isRequired && <span className="text-red-500 text-xs">*</span>}
            </div>
            {isMultiSelect && (
              <p className="text-xs text-muted-foreground mb-2">
                {minVariations > 0
                  ? `Selecione de ${minVariations} a ${maxVariations} partes`
                  : `Selecione ate ${maxVariations} partes`}
                {totalSelectedParts > 0 && (
                  <span className="ml-1 font-medium text-foreground">
                    ({totalSelectedParts}/{maxVariations})
                  </span>
                )}
              </p>
            )}
            <div className="space-y-1.5">
              {product.variations.map((v: any) => {
                const isSelected = selectedVariations.has(v.id);
                const varQty = selectedVariations.get(v.id) || 0;
                const canAdd = maxVariations === 0 || totalSelectedParts < maxVariations;

                if (isMultiSelect) {
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{v.name}</span>
                        <span className="text-muted-foreground ml-2">{formatPrice(v.price)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <button onClick={() => decrementVariation(v.id)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted">
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                        <span className={cn('w-5 text-center text-sm font-bold', isSelected ? 'text-foreground' : 'text-muted-foreground')}>{varQty}</span>
                        <button
                          onClick={() => incrementVariation(v.id)}
                          disabled={!canAdd}
                          className={cn('w-7 h-7 rounded-lg border flex items-center justify-center', canAdd ? 'border-primary text-primary hover:bg-primary/5' : 'border-border text-muted-foreground cursor-not-allowed')}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVariation(v.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-300')}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="font-medium text-foreground">{v.name}</span>
                    </div>
                    <span className="font-semibold text-muted-foreground">{formatPrice(v.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Extras */}
        {product.extra_groups?.map((group: any) => {
          if (!group.extras?.length) return null;
          const selectedInGroup = group.extras.filter((e: any) => selectedExtras.has(e.id)).length;
          return (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">{group.name}</p>
                {group.is_required && <span className="text-red-500 text-xs">*</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {group.is_required
                  ? `Selecione de ${group.min_select || 1} a ${group.max_select}`
                  : `Selecione ate ${group.max_select}`}
                {selectedInGroup > 0 && (
                  <span className="ml-1 font-medium text-foreground">({selectedInGroup}/{group.max_select})</span>
                )}
              </p>
              <div className="space-y-1.5">
                {group.extras.map((extra: any) => {
                  const isSelected = selectedExtras.has(extra.id);
                  const atMax = !isSelected && group.max_select && selectedInGroup >= group.max_select;
                  return (
                    <button
                      key={extra.id}
                      onClick={() => !atMax && toggleExtra(extra, group)}
                      disabled={!!atMax}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all',
                        atMax ? 'border-border opacity-50 cursor-not-allowed' :
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-300')}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="font-medium text-foreground">{extra.name}</span>
                      </div>
                      <span className="font-semibold text-muted-foreground">+ {formatPrice(extra.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Quantity */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Quantidade</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold w-8 text-center">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-9 h-9 rounded-xl border border-primary text-primary flex items-center justify-center hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Observacao</p>
          <textarea
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            placeholder="Ex: sem cebola, bem passado..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-red-600 dark:text-red-400">{err}</p>
            ))}
          </div>
        )}

        {/* Add button */}
        <Button onClick={handleAdd} className="w-full" size="lg">
          Adicionar {formatPrice(totalPrice)}
        </Button>
      </div>
    </Modal>
  );
}

export default function POS() {
  const navigate = useNavigate();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const [createOrder, { isLoading: creating }] = useCreateAdminOrderMutation();
  const [createCustomer, { isLoading: creatingCustomer }] = useCreateCustomerMutation();
  const { data: cashRegister } = useGetCashRegisterQuery();
  const [openRegister, { isLoading: openingRegister }] = useOpenCashRegisterMutation();
  const [closeRegister, { isLoading: closingRegister }] = useCloseCashRegisterMutation();

  // Cash register state
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const isCashRegisterOpen = !!cashRegister;

  // Catalog state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState('pickup');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([{ method: 'cash', amount: 0 }]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
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

  const handleProductClick = (product: any) => {
    const hasVariations = product.variations && product.variations.length > 0;
    const hasExtras = product.extra_groups && product.extra_groups.some((g: any) => g.extras?.length > 0);

    if (!hasVariations && !hasExtras) {
      // Simple product — add directly
      setCart((prev) => {
        const existing = prev.find((item) => item.product_id === product.id && !item.variation_id);
        if (existing) {
          return prev.map((item) =>
            item === existing ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [...prev, {
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          unit_price: Number(product.base_price),
          quantity: 1,
          extras: [],
        }];
      });
    } else {
      // Has options — open modal
      setSelectedProduct(product);
    }
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
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
    if (!isCashRegisterOpen) {
      setShowOpenRegister(true);
      return;
    }

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
      notes: [notes, deliveryNotes].filter(Boolean).join(' | ') || undefined,
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
      setCart([]);
      setSelectedCustomer(null);
      setNotes('');
      setDeliveryNotes('');
      setChangeFor('');
      setPaymentSplits([{ method: 'cash', amount: 0 }]);
      setTimeout(() => setOrderSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader title="PDV" description="Ponto de Venda" />

      {/* Cash Register Bar */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card">
        {isCashRegisterOpen ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Unlock className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">Caixa aberto</span>
              <span className="text-muted-foreground">
                — Abertura: {formatPrice(cashRegister.opening_balance)}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCloseRegister(true)}>
              <Lock className="w-4 h-4 mr-1" /> Fechar Caixa
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-red-400" />
              <span className="text-red-500 font-medium">Caixa fechado</span>
            </div>
            <Button size="sm" onClick={() => setShowOpenRegister(true)}>
              <Unlock className="w-4 h-4 mr-1" /> Abrir Caixa
            </Button>
          </>
        )}
      </div>

      {/* Open Cash Register Modal */}
      {showOpenRegister && (
        <Modal open onClose={() => setShowOpenRegister(false)} title="Abrir Caixa" className="md:max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor de abertura (R$)</label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              loading={openingRegister}
              onClick={async () => {
                await openRegister({ opening_balance: parseFloat(openingBalance) || 0 }).unwrap();
                setShowOpenRegister(false);
                setOpeningBalance('');
              }}
            >
              Abrir Caixa
            </Button>
          </div>
        </Modal>
      )}

      {/* Close Cash Register Modal */}
      {showCloseRegister && (
        <Modal open onClose={() => setShowCloseRegister(false)} title="Fechar Caixa" className="md:max-w-sm">
          <div className="space-y-4">
            {cashRegister && (
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <p className="text-muted-foreground">Abertura: <span className="font-medium text-foreground">{formatPrice(cashRegister.opening_balance)}</span></p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor em caixa (R$)</label>
              <Input
                type="number"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Observacoes</label>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Observacoes do fechamento..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none"
              />
            </div>
            <Button
              className="w-full"
              variant="danger"
              loading={closingRegister}
              onClick={async () => {
                const result = await closeRegister({ closing_balance: parseFloat(closingBalance) || 0, notes: closingNotes || undefined }).unwrap();
                setShowCloseRegister(false);
                setClosingBalance('');
                setClosingNotes('');
                // Show summary alert
                alert(`Caixa fechado!\n\nPedidos: ${result.orders_count}\nDinheiro: R$ ${Number(result.total_cash).toFixed(2)}\nCredito: R$ ${Number(result.total_credit).toFixed(2)}\nDebito: R$ ${Number(result.total_debit).toFixed(2)}\nPIX: R$ ${Number(result.total_pix).toFixed(2)}`);
              }}
            >
              Fechar Caixa
            </Button>
          </div>
        </Modal>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product Catalog */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Search + Category filter */}
          <div className="p-4 space-y-3 border-b border-border">
            <SearchInput
              value={search}
              onChange={(val) => setSearch(val)}
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
              {filteredProducts.map((product: any) => {
                const hasOptions = (product.variations?.length > 0) || product.extra_groups?.some((g: any) => g.extras?.length > 0);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary hover:shadow-md transition-all active:scale-95 relative"
                  >
                    {hasOptions && (
                      <span className="absolute top-2 right-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        +
                      </span>
                    )}
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
                );
              })}
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

            {/* Delivery notes */}
            {orderType === 'delivery' && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Endereco / Obs. entrega</p>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Endereco de entrega, referencia, observacoes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}

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
              ) : showNewCustomer ? (
                <div className="space-y-2">
                  <Input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="text-sm"
                    autoFocus
                  />
                  <Input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="Telefone (ex: 98991741075)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowNewCustomer(false); setNewCustomerName(''); setNewCustomerPhone(''); }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      loading={creatingCustomer}
                      disabled={!newCustomerName.trim() || !newCustomerPhone.trim()}
                      onClick={async () => {
                        try {
                          const customer = await createCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() }).unwrap();
                          setSelectedCustomer(customer);
                          setShowNewCustomer(false);
                          setNewCustomerName('');
                          setNewCustomerPhone('');
                        } catch { /* ignore */ }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomerSearch(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Search className="w-4 h-4" /> Buscar
                  </button>
                  <button
                    onClick={() => setShowNewCustomer(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <UserPlus className="w-4 h-4" /> Novo
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
                        {item.extras.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            + {item.extras.map((e) => e.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic truncate">{item.notes}</p>
                        )}
                        <p className="text-sm font-bold text-primary">
                          {formatPrice((item.unit_price + item.extras.reduce((s, e) => s + e.price, 0)) * item.quantity)}
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
