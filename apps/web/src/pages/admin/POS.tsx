import { useState, useMemo, useEffect } from 'react';
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
  Lock,
  Unlock,
  Receipt,
} from 'lucide-react';
import { useGetProductsQuery, useGetCategoriesQuery, useGetCustomersQuery, useCreateAdminOrderMutation, useCreateCustomerMutation, useGetCashRegisterQuery, useOpenCashRegisterMutation, useCloseCashRegisterMutation, useGetTablesQuery, useGetTenantBySlugQuery } from '@/api/adminApi';
import { useAppSelector as useAppSelectorStore } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import { generatePixPayload, generatePixQrCodeDataUrl } from '@/utils/pixQrCode';

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
  { value: 'pix' as const, label: 'PIX', icon: QrCode, color: 'text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950 dark:border-teal-800' },
  { value: 'credit_card' as const, label: 'Credito', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800' },
  { value: 'debit_card' as const, label: 'Debito', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800' },
  { value: 'cash' as const, label: 'Dinheiro', icon: Banknote, color: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800' },
];

const ORDER_TYPES = [
  { value: 'delivery', label: 'Delivery', icon: Truck },
  { value: 'pickup', label: 'Retirada', icon: Store },
  { value: 'dine_in', label: 'Mesa', icon: UtensilsCrossed },
];

// ── Product Detail Modal ──
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

  const toggleVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      if (!isMultiSelect) {
        if (next.has(variationId) && !isRequired) { next.clear(); } else { next.clear(); next.set(variationId, 1); }
      } else {
        if (next.has(variationId)) { next.delete(variationId); } else if (maxVariations === 0 || totalSelectedParts < maxVariations) { next.set(variationId, 1); }
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
      if (current <= 1) { next.delete(variationId); } else { next.set(variationId, current - 1); }
      return next;
    });
  };

  const toggleExtra = (extra: any, group: any) => {
    setSelectedExtras((prev) => {
      const next = new Map(prev);
      if (next.has(extra.id)) { next.delete(extra.id); }
      else {
        const selectedInGroup = group.extras.filter((e: any) => next.has(e.id)).length;
        if (group.max_select && selectedInGroup >= group.max_select) return prev;
        next.set(extra.id, { name: extra.name, price: Number(extra.price) });
      }
      return next;
    });
  };

  const getBasePrice = () => {
    if (selectedVariations.size === 0) return Number(product.base_price);
    if (isMultiSelect && totalSelectedParts > 0) {
      // Multi-select (pizza rule): use base_price or highest variation if more expensive
      const basePrice = Number(product.base_price);
      let maxVarPrice = 0;
      for (const [varId] of selectedVariations) {
        const variation = product.variations?.find((v: any) => v.id === varId);
        if (variation) {
          const p = Number(variation.price);
          if (p > maxVarPrice) maxVarPrice = p;
        }
      }
      return Math.max(basePrice, maxVarPrice);
    }
    const selected = product.variations?.find((v: any) => selectedVariations.has(v.id));
    return selected ? Number(selected.price) : Number(product.base_price);
  };

  const unitPrice = getBasePrice();
  const extrasTotal = Array.from(selectedExtras.values()).reduce((s, e) => s + e.price, 0);
  const totalPrice = (unitPrice + extrasTotal) * qty;

  const isSelectionIncomplete = hasVariations && isRequired && isMultiSelect && totalSelectedParts < minVariations;

  const validate = (): string[] => {
    const errs: string[] = [];
    if (hasVariations && isRequired) {
      if (!isMultiSelect && selectedVariations.size === 0) errs.push('Selecione uma opcao');
      else if (isMultiSelect && totalSelectedParts < minVariations) errs.push(`Selecione pelo menos ${minVariations} ${minVariations === 1 ? 'parte' : 'partes'}`);
    }
    if (product.extra_groups) {
      for (const group of product.extra_groups) {
        if (group.is_required) {
          const selectedInGroup = group.extras.filter((e: any) => selectedExtras.has(e.id)).length;
          if (selectedInGroup < (group.min_select || 1)) errs.push(`Selecione pelo menos ${group.min_select || 1} item em "${group.name}"`);
        }
      }
    }
    return errs;
  };

  const handleAdd = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setErrors([]);
    const selected = product.variations?.filter((v: any) => selectedVariations.has(v.id)) || [];
    let variationName: string | undefined;
    if (isMultiSelect && totalSelectedParts > 0) {
      variationName = selected.map((v: any) => { const vQty = selectedVariations.get(v.id) || 1; return `${vQty}/${totalSelectedParts} ${v.name}`; }).join(' / ');
    } else {
      variationName = selected.map((v: any) => v.name).join(' / ') || undefined;
    }
    onAdd({
      product_id: product.id, product_name: product.name, product_image: product.image_url,
      variation_id: selected[0]?.id, variation_name: variationName, unit_price: unitPrice,
      quantity: qty, extras: Array.from(selectedExtras.values()), notes: itemNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={product.name} className="md:max-w-md">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {hasVariations && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-foreground">{isMultiSelect ? 'Escolha suas opcoes' : 'Escolha uma opcao'}</p>
              {isRequired && <span className="text-red-500 text-xs font-bold">*</span>}
            </div>
            {isMultiSelect && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground">
                  {minVariations === maxVariations
                    ? `Escolha ${maxVariations} ${maxVariations === 1 ? 'sabor' : 'sabores'} — pode ser um so sabor ou sabores diferentes`
                    : minVariations > 0
                      ? `Escolha de ${minVariations} a ${maxVariations} sabores`
                      : `Escolha ate ${maxVariations} sabores`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-300 bg-primary" style={{ width: `${Math.min(100, (totalSelectedParts / maxVariations) * 100)}%`, backgroundColor: totalSelectedParts >= minVariations ? undefined : '#f59e0b' }} />
                  </div>
                  <span className={cn('text-xs font-bold', totalSelectedParts >= minVariations ? 'text-green-600' : 'text-amber-600')}>
                    {totalSelectedParts}/{maxVariations}
                  </span>
                </div>
                {totalSelectedParts > 0 && totalSelectedParts < minVariations && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Falta{minVariations - totalSelectedParts === 1 ? '' : 'm'} {minVariations - totalSelectedParts}</p>
                )}
                {totalSelectedParts === maxVariations && (
                  <p className="text-[10px] text-green-600 mt-0.5 font-medium">Selecao completa!</p>
                )}
              </div>
            )}
            <div className="space-y-1">
              {product.variations.map((v: any) => {
                const isSelected = selectedVariations.has(v.id);
                const varQty = selectedVariations.get(v.id) || 0;
                const canAdd = maxVariations === 0 || totalSelectedParts < maxVariations;
                if (isMultiSelect) {
                  return (
                    <div key={v.id} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border transition-all', isSelected ? 'border-primary bg-primary/5' : 'border-border')}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{v.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatPrice(v.price)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && <button onClick={() => decrementVariation(v.id)} className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>}
                        <span className={cn('w-5 text-center text-xs font-bold', isSelected ? 'text-foreground' : 'text-muted-foreground')}>{varQty}</span>
                        <button onClick={() => incrementVariation(v.id)} disabled={!canAdd} className={cn('w-6 h-6 rounded-md border flex items-center justify-center', canAdd ? 'border-primary text-primary hover:bg-primary/5' : 'border-border text-muted-foreground cursor-not-allowed')}><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button key={v.id} onClick={() => toggleVariation(v.id)} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all', isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-300')}>{isSelected && <Check className="w-2 h-2 text-white" />}</div>
                      <span className="text-sm font-medium text-foreground">{v.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{formatPrice(v.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {product.extra_groups?.map((group: any) => {
          if (!group.extras?.length) return null;
          const selectedInGroup = group.extras.filter((e: any) => selectedExtras.has(e.id)).length;
          return (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">{group.name}</p>
                {group.is_required && <span className="text-red-500 text-xs font-bold">*</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {group.is_required ? `De ${group.min_select || 1} a ${group.max_select}` : `Ate ${group.max_select}`}
                {selectedInGroup > 0 && <span className="ml-1 font-semibold text-primary">({selectedInGroup}/{group.max_select})</span>}
              </p>
              <div className="space-y-1">
                {group.extras.map((extra: any) => {
                  const isSelected = selectedExtras.has(extra.id);
                  const atMax = !isSelected && group.max_select && selectedInGroup >= group.max_select;
                  return (
                    <button key={extra.id} onClick={() => !atMax && toggleExtra(extra, group)} disabled={!!atMax} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all', atMax ? 'border-border opacity-50 cursor-not-allowed' : isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-300')}>{isSelected && <Check className="w-2 h-2 text-white" />}</div>
                        <span className="text-sm font-medium text-foreground">{extra.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">+ {formatPrice(extra.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Quantidade</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted"><Minus className="w-3.5 h-3.5" /></button>
            <span className="text-base font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-lg border border-primary text-primary flex items-center justify-center hover:bg-primary/5"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} placeholder="Observacao do item..." rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none" />

        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
            {errors.map((err, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>)}
          </div>
        )}
      </div>
      <div className="pt-3 mt-3 border-t border-border">
        {isSelectionIncomplete && (
          <p className="text-center text-xs text-amber-600 font-medium mb-2">Selecione {minVariations - totalSelectedParts} {minVariations - totalSelectedParts === 1 ? 'sabor' : 'sabores'} para adicionar</p>
        )}
        <Button onClick={handleAdd} className="w-full" size="lg" disabled={isSelectionIncomplete}>
          {isSelectionIncomplete ? 'Complete a selecao' : `Adicionar ${formatPrice(totalPrice)}`}
        </Button>
      </div>
    </Modal>
  );
}

// ── Main POS Component ──
export default function POS() {
  const notify = useNotify();
  const navigate = useNavigate();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const [createOrder, { isLoading: creating }] = useCreateAdminOrderMutation();
  const [createCustomer, { isLoading: creatingCustomer }] = useCreateCustomerMutation();
  const { data: cashRegister } = useGetCashRegisterQuery();
  const [openRegister, { isLoading: openingRegister }] = useOpenCashRegisterMutation();
  const [closeRegister, { isLoading: closingRegister }] = useCloseCashRegisterMutation();
  const { data: tables = [] } = useGetTablesQuery();
  const tenantSlug = useAppSelectorStore((s) => s.adminAuth.tenantSlug);
  const { data: tenant } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });

  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const isCashRegisterOpen = !!cashRegister;

  const printCashReceipt = (title: string, data: Record<string, string>) => {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write('<html><head><title>' + title + '</title><style>body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:3px 0}.right{text-align:right}.bold{font-weight:bold}.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}</style></head><body>');
    win.document.write('<div class="center"><strong>' + title.toUpperCase() + '</strong></div>');
    win.document.write('<div class="center">' + new Date().toLocaleString('pt-BR') + '</div>');
    win.document.write('<div class="line"></div>');
    win.document.write('<table>');
    for (const [k, v] of Object.entries(data)) {
      win.document.write('<tr><td>' + k + '</td><td class="right">' + v + '</td></tr>');
    }
    win.document.write('</table>');
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState('pickup');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  // POS orders are always paid at counter
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([{ method: 'cash', amount: 0 }]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);
  const [pixPayloadStr, setPixPayloadStr] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (p.is_active === false) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 10);
  }, [customers, customerSearch]);

  const subtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return sum + (item.unit_price + extrasTotal) * item.quantity;
  }, 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Generate PIX QR code when payment is PIX and has amount
  const isPix = paymentSplits.some((s) => s.method === 'pix');
  const pixKey = tenant?.payment_config?.pix_key;
  useEffect(() => {
    if (!isPix || !pixKey || total <= 0) {
      setPixQrUrl(null);
      setPixPayloadStr('');
      return;
    }
    const payload = generatePixPayload({
      pixKey,
      merchantName: tenant?.name || 'MenuFacil',
      merchantCity: 'Brasil',
      amount: total,
      txId: '***',
    });
    setPixPayloadStr(payload);
    generatePixQrCodeDataUrl({
      pixKey,
      merchantName: tenant?.name || 'MenuFacil',
      merchantCity: 'Brasil',
      amount: total,
    }).then(setPixQrUrl).catch(() => setPixQrUrl(null));
  }, [isPix, pixKey, total, tenant?.name]);

  const handleProductClick = (product: any) => {
    const hasOptions = (product.variations?.length > 0) || product.extra_groups?.some((g: any) => g.extras?.length > 0);
    if (!hasOptions) {
      setCart((prev) => {
        const existing = prev.find((item) => item.product_id === product.id && !item.variation_id);
        if (existing) return prev.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
        return [...prev, { product_id: product.id, product_name: product.name, product_image: product.image_url, unit_price: Number(product.base_price), quantity: 1, extras: [] }];
      });
    } else {
      setSelectedProduct(product);
    }
  };

  const addToCart = (item: CartItem) => setCart((prev) => [...prev, item]);
  const updateQuantity = (index: number, delta: number) => setCart((prev) => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  const removeFromCart = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));
  const updatePaymentSplit = (index: number, field: string, value: any) => setPaymentSplits((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  const addPaymentSplit = () => setPaymentSplits((prev) => [...prev, { method: 'pix', amount: 0 }]);
  const removePaymentSplit = (index: number) => { if (paymentSplits.length > 1) setPaymentSplits((prev) => prev.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (!isCashRegisterOpen) { setShowOpenRegister(true); return; }

    const data: any = {
      items: cart.map((item) => ({ product_id: item.product_id, variation_id: item.variation_id || undefined, quantity: item.quantity, notes: item.notes || undefined, extras: item.extras.length > 0 ? item.extras : undefined })),
      order_type: orderType, is_paid: true, table_id: orderType === 'dine_in' && selectedTableId ? selectedTableId : undefined, notes: [notes, deliveryNotes].filter(Boolean).join(' | ') || undefined,
    };
    if (selectedCustomer) { data.customer_id = selectedCustomer.id; data.customer_name = selectedCustomer.name; }
    if (paymentSplits.length === 1) {
      data.payment_method = paymentSplits[0].method;
      if (paymentSplits[0].method === 'cash' && changeFor) data.change_for = parseFloat(changeFor);
    } else {
      data.payment_splits = paymentSplits.map((s) => ({ method: s.method, amount: s.amount || total / paymentSplits.length }));
      data.payment_method = paymentSplits[0].method;
    }

    try {
      const order = await createOrder(data).unwrap();
      setOrderSuccess(order.order_number);
      setCart([]); setSelectedCustomer(null); setNotes(''); setDeliveryNotes(''); setChangeFor(''); setSelectedTableId('');
      setPaymentSplits([{ method: 'cash', amount: 0 }]);
      setTimeout(() => setOrderSuccess(null), 4000);
    } catch (err: any) { notify.error(err?.data?.message || 'Erro ao criar pedido.'); }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-muted/30">
      {/* Cash Register + Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">PDV</h1>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            {isCashRegisterOpen ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Caixa aberto</span>
                <span className="text-xs text-muted-foreground">({formatPrice(cashRegister.opening_balance)})</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-medium text-red-500">Caixa fechado</span>
              </>
            )}
          </div>
        </div>
        <div>
          {isCashRegisterOpen ? (
            <button onClick={() => setShowCloseRegister(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Lock className="w-3.5 h-3.5" /> Fechar Caixa
            </button>
          ) : (
            <Button size="sm" onClick={() => setShowOpenRegister(true)}>
              <Unlock className="w-3.5 h-3.5 mr-1" /> Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showOpenRegister && (
        <Modal open onClose={() => setShowOpenRegister(false)} title="Abrir Caixa" className="md:max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor de abertura (R$)</label>
              <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <Button className="w-full" loading={openingRegister} onClick={async () => { const bal = parseFloat(openingBalance) || 0; await openRegister({ opening_balance: bal }).unwrap(); setShowOpenRegister(false); setOpeningBalance(''); printCashReceipt('Abertura de Caixa', { 'Valor de abertura': 'R$ ' + bal.toFixed(2) }); }}>
              Abrir Caixa
            </Button>
          </div>
        </Modal>
      )}
      {showCloseRegister && (
        <Modal open onClose={() => setShowCloseRegister(false)} title="Fechar Caixa" className="md:max-w-sm">
          <div className="space-y-4">
            {cashRegister && (
              <div className="bg-muted/50 rounded-xl p-3 text-sm">
                <p className="text-muted-foreground">Abertura: <span className="font-medium text-foreground">{formatPrice(cashRegister.opening_balance)}</span></p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor em caixa (R$)</label>
              <Input type="number" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Observacoes</label>
              <textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Observacoes do fechamento..." rows={2} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:border-primary focus:outline-none" />
            </div>
            <Button className="w-full" variant="danger" loading={closingRegister} onClick={async () => {
              const result = await closeRegister({ closing_balance: parseFloat(closingBalance) || 0, notes: closingNotes || undefined }).unwrap();
              setShowCloseRegister(false); setClosingBalance(''); setClosingNotes('');
              setClosingSummary(result);
            }}>Fechar Caixa</Button>
          </div>
        </Modal>
      )}

      {/* Closing Summary Modal (printable) */}
      {closingSummary && (
        <Modal open onClose={() => setClosingSummary(null)} title="Resumo do Caixa" className="md:max-w-md">
          <div id="closing-summary-print">
            <div className="text-center mb-4">
              <p className="text-lg font-bold text-foreground">Fechamento de Caixa</p>
              <p className="text-xs text-muted-foreground">{new Date(closingSummary.closed_at).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Abertura</span>
                <span className="font-medium">{formatPrice(closingSummary.opening_balance)}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Fechamento</span>
                <span className="font-medium">{formatPrice(closingSummary.closing_balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Pedidos</span>
                <span className="font-bold">{closingSummary.orders_count}</span>
              </div>
              <div className="h-px bg-border" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">Vendas por metodo</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-green-600" /> Dinheiro</span>
                  <span className="font-medium">{formatPrice(closingSummary.total_cash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-blue-600" /> Credito</span>
                  <span className="font-medium">{formatPrice(closingSummary.total_credit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Debito</span>
                  <span className="font-medium">{formatPrice(closingSummary.total_debit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><QrCode className="w-3.5 h-3.5 text-teal-600" /> PIX</span>
                  <span className="font-medium">{formatPrice(closingSummary.total_pix)}</span>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total Geral</span>
                <span className="text-primary">{formatPrice(Number(closingSummary.total_cash) + Number(closingSummary.total_credit) + Number(closingSummary.total_debit) + Number(closingSummary.total_pix))}</span>
              </div>
              {closingSummary.closing_notes && (
                <div className="bg-muted/50 rounded-lg p-2 mt-2">
                  <p className="text-xs text-muted-foreground">{closingSummary.closing_notes}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => {
              const printContent = document.getElementById('closing-summary-print');
              if (!printContent) return;
              const win = window.open('', '_blank', 'width=400,height=600');
              if (!win) return;
              win.document.write(`<html><head><title>Fechamento de Caixa</title><style>body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:3px 0}.right{text-align:right}.bold{font-weight:bold}.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}</style></head><body>`);
              win.document.write('<div class="center"><strong>FECHAMENTO DE CAIXA</strong></div>');
              win.document.write('<div class="center">' + new Date(closingSummary.closed_at).toLocaleString('pt-BR') + '</div>');
              win.document.write('<div class="line"></div>');
              win.document.write('<table>');
              win.document.write('<tr><td>Abertura</td><td class="right">R$ ' + Number(closingSummary.opening_balance).toFixed(2) + '</td></tr>');
              win.document.write('<tr><td>Fechamento</td><td class="right">R$ ' + Number(closingSummary.closing_balance).toFixed(2) + '</td></tr>');
              win.document.write('<tr><td>Pedidos</td><td class="right">' + closingSummary.orders_count + '</td></tr>');
              win.document.write('</table>');
              win.document.write('<div class="line"></div>');
              win.document.write('<div class="bold">VENDAS POR METODO</div>');
              win.document.write('<table>');
              win.document.write('<tr><td>Dinheiro</td><td class="right">R$ ' + Number(closingSummary.total_cash).toFixed(2) + '</td></tr>');
              win.document.write('<tr><td>Credito</td><td class="right">R$ ' + Number(closingSummary.total_credit).toFixed(2) + '</td></tr>');
              win.document.write('<tr><td>Debito</td><td class="right">R$ ' + Number(closingSummary.total_debit).toFixed(2) + '</td></tr>');
              win.document.write('<tr><td>PIX</td><td class="right">R$ ' + Number(closingSummary.total_pix).toFixed(2) + '</td></tr>');
              win.document.write('</table>');
              win.document.write('<div class="line"></div>');
              const grandTotal = Number(closingSummary.total_cash) + Number(closingSummary.total_credit) + Number(closingSummary.total_debit) + Number(closingSummary.total_pix);
              win.document.write('<table><tr class="bold"><td>TOTAL GERAL</td><td class="right">R$ ' + grandTotal.toFixed(2) + '</td></tr></table>');
              if (closingSummary.closing_notes) win.document.write('<div class="line"></div><div>Obs: ' + closingSummary.closing_notes + '</div>');
              win.document.write('</body></html>');
              win.document.close();
              win.print();
            }}>
              Imprimir
            </Button>
            <Button className="flex-1" onClick={() => setClosingSummary(null)}>Fechar</Button>
          </div>
        </Modal>
      )}

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}

      {/* Success toast */}
      {orderSuccess && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Pedido #{orderSuccess} criado!</span>
          <button onClick={() => navigate('/admin/orders')} className="text-white/80 hover:text-white underline text-sm ml-2">Ver</button>
        </div>
      )}

      {/* Fullscreen "Abrir Caixa" when register is closed */}
      {!isCashRegisterOpen ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg text-foreground">Para comecar a efetuar vendas e preciso</p>
            <p className="text-lg font-bold text-foreground">abrir o caixa</p>
          </div>
          <Button size="lg" onClick={() => setShowOpenRegister(true)} className="px-8">
            <Unlock className="w-5 h-5 mr-2" /> Abrir Caixa
          </Button>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Catalog ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 bg-card border-b border-border">
            <SearchInput value={search} onChange={(val) => setSearch(val)} placeholder="Buscar produto..." />
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button onClick={() => setSelectedCategory(null)} className={cn('px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors', !selectedCategory ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                Todos
              </button>
              {categories.filter((c: any) => c.is_active !== false).map((cat: any) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn('px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors', selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product: any) => {
                const hasOptions = (product.variations?.length > 0) || product.extra_groups?.some((g: any) => g.extras?.length > 0);
                const inCart = cart.filter((c) => c.product_id === product.id).reduce((sum, c) => sum + c.quantity, 0);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      'relative flex flex-col bg-card border rounded-2xl p-3 text-left hover:shadow-lg transition-all active:scale-[0.97]',
                      inCart > 0 ? 'border-primary shadow-md' : 'border-border hover:border-primary/40',
                    )}
                  >
                    {inCart > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                        {inCart}
                      </span>
                    )}
                    {hasOptions && !inCart && (
                      <span className="absolute top-2 right-2 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md">+</span>
                    )}
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover rounded-xl mb-2" />
                    ) : (
                      <div className="w-full aspect-square bg-muted rounded-xl mb-2 flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatPrice(product.base_price)}</p>
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart Panel ── */}
        <div className="w-[380px] flex flex-col bg-card border-l border-border">
          <div className="flex-1 overflow-y-auto">
            {/* Order Type + Delivery */}
            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-3 gap-1.5">
                {ORDER_TYPES.map((type) => (
                  <button key={type.value} onClick={() => setOrderType(type.value)} className={cn('flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all', orderType === type.value ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                    <type.icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                ))}
              </div>
              {orderType === 'delivery' && (
                <textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Endereco / referencia..." rows={2} className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none focus:border-primary focus:outline-none" />
              )}
              {orderType === 'dine_in' && (
                <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:border-primary focus:outline-none">
                  <option value="">Selecionar mesa...</option>
                  {tables.filter((t: any) => t.is_active).map((t: any) => (
                    <option key={t.id} value={t.id}>Mesa {t.number}{t.label ? ` - ${t.label}` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Customer */}
            <div className="p-3 border-b border-border">
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : showCustomerSearch ? (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Nome ou telefone..." className="text-xs h-8" autoFocus />
                    <button onClick={() => { setShowCustomerSearch(false); setCustomerSearch(''); }} className="text-muted-foreground hover:text-foreground p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {filteredCustomers.map((c: any) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }} className="w-full px-2.5 py-1.5 text-left hover:bg-muted/50 transition-colors">
                        <p className="text-xs font-medium text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum encontrado</p>}
                  </div>
                </div>
              ) : showNewCustomer ? (
                <div className="space-y-1.5">
                  <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Nome" className="text-xs h-8" autoFocus />
                  <Input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Telefone" className="text-xs h-8" />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowNewCustomer(false); setNewCustomerName(''); setNewCustomerPhone(''); }}>Cancelar</Button>
                    <Button size="sm" className="h-7 text-xs" loading={creatingCustomer} disabled={!newCustomerName.trim() || !newCustomerPhone.trim()} onClick={async () => {
                      try { const c = await createCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() }).unwrap(); setSelectedCustomer(c); setShowNewCustomer(false); setNewCustomerName(''); setNewCustomerPhone(''); } catch (err: any) { notify.error(err?.data?.message || 'Erro ao cadastrar cliente.'); }
                    }}>Salvar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setShowCustomerSearch(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"><Search className="w-3 h-3" /> Buscar</button>
                  <button onClick={() => setShowNewCustomer(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"><UserPlus className="w-3 h-3" /> Novo</button>
                  <button onClick={() => {}} className="flex items-center justify-center py-2 px-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors" title="Sem cliente"><UserX className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="p-3 flex-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Clique em um produto para adicionar</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((item, index) => (
                    <div key={`${item.product_id}-${index}`} className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">{item.product_name}</p>
                        {item.variation_name && <p className="text-[10px] text-muted-foreground">{item.variation_name}</p>}
                        {item.extras.length > 0 && <p className="text-[10px] text-muted-foreground">+ {item.extras.map((e) => e.name).join(', ')}</p>}
                        {item.notes && <p className="text-[10px] text-muted-foreground italic">{item.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-xs font-bold text-primary">{formatPrice((item.unit_price + item.extras.reduce((s, e) => s + e.price, 0)) * item.quantity)}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(index, -1)} className="w-5 h-5 rounded border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, 1)} className="w-5 h-5 rounded border border-primary/50 text-primary flex items-center justify-center hover:bg-primary/5"><Plus className="w-2.5 h-2.5" /></button>
                          <button onClick={() => removeFromCart(index)} className="w-5 h-5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment + Totals Footer */}
          {cart.length > 0 && (
            <div className="border-t border-border bg-card">
              {/* Payment method */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pagamento</p>
                  {paymentSplits.length < 4 && (
                    <button onClick={addPaymentSplit} className="text-[10px] text-primary hover:text-primary-dark flex items-center gap-0.5"><Plus className="w-2.5 h-2.5" /> Dividir</button>
                  )}
                </div>
                {paymentSplits.map((split, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex gap-1">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m.value} onClick={() => updatePaymentSplit(index, 'method', m.value)} className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all', split.method === m.value ? m.color + ' border-current' : 'border-border text-muted-foreground hover:text-foreground')}>
                          <m.icon className="w-3 h-3" />
                          {m.label}
                        </button>
                      ))}
                      {paymentSplits.length > 1 && (
                        <button onClick={() => removePaymentSplit(index)} className="text-red-400 hover:text-red-600 px-1"><X className="w-3 h-3" /></button>
                      )}
                    </div>
                    {paymentSplits.length > 1 && (
                      <Input type="number" value={split.amount || ''} onChange={(e) => updatePaymentSplit(index, 'amount', parseFloat(e.target.value) || 0)} placeholder="Valor" className="text-xs h-7 mt-1" />
                    )}
                  </div>
                ))}

                {/* Cash: valor recebido + troco */}
                {paymentSplits.some((s) => s.method === 'cash') && (
                  <div className="mt-1 bg-green-50 dark:bg-green-950 rounded-lg p-2.5 space-y-1.5">
                    <div>
                      <label className="text-[10px] font-medium text-green-700 dark:text-green-300 mb-0.5 block">Valor recebido (R$)</label>
                      <Input type="number" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder={total.toFixed(2)} className="text-xs h-8 bg-white dark:bg-green-900 border-green-200 dark:border-green-800" />
                    </div>
                    {changeFor && parseFloat(changeFor) >= total && (
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Troco</span>
                        <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatPrice(parseFloat(changeFor) - total)}</span>
                      </div>
                    )}
                    {changeFor && parseFloat(changeFor) > 0 && parseFloat(changeFor) < total && (
                      <p className="text-[10px] text-red-500 font-medium px-1">Valor insuficiente (faltam {formatPrice(total - parseFloat(changeFor))})</p>
                    )}
                  </div>
                )}

                {/* PIX QR Code */}
                {isPix && (
                  <div className="mt-2 bg-teal-50 dark:bg-teal-950 rounded-xl p-3 text-center">
                    {pixQrUrl ? (
                      <>
                        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2">QR Code PIX — {formatPrice(total)}</p>
                        <img src={pixQrUrl} alt="PIX QR Code" className="mx-auto w-40 h-40 rounded-lg" />
                        <button
                          onClick={() => { navigator.clipboard.writeText(pixPayloadStr); }}
                          className="mt-2 text-[10px] text-teal-600 hover:text-teal-800 font-medium underline"
                        >
                          Copiar codigo PIX
                        </button>
                      </>
                    ) : pixKey ? (
                      <p className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">Gerando QR Code...</p>
                    ) : (
                      <p className="text-[10px] text-red-500 font-medium">Configure a chave PIX em Configuracoes {'>'} Pagamento</p>
                    )}
                  </div>
                )}
              </div>

              {/* Obs */}
              <div className="px-3 py-2 border-b border-border">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observacao do pedido..." className="w-full text-xs text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground" />
              </div>

              {/* Totals + Submit */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-foreground">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                  <span className="text-xl font-extrabold text-primary">{formatPrice(total)}</span>
                </div>
                <Button onClick={handleSubmit} loading={creating} disabled={cart.length === 0} className="w-full" size="lg">
                  <Check className="w-5 h-5 mr-2" />
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
