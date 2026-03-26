import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  Lock,
  Unlock,
  Receipt,
  AlertTriangle,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react';
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetCustomersQuery,
  useCreateAdminOrderMutation,
  useCreateCustomerMutation,
  useGetCashRegisterQuery,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
  useGetTablesQuery,
  useGetTenantBySlugQuery,
  useGetOrdersQuery,
} from '@/api/api';
import { useAppSelector } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { formatPrice } from '@/utils/formatPrice';
import { generatePixPayload, generatePixQrCodeDataUrl } from '@/utils/pixQrCode';

import ProductGrid from '@/components/pdv/ProductGrid';
import Cart from '@/components/pdv/Cart';
import PaymentSection from '@/components/pdv/PaymentModal';
import ProductDetailModal from '@/components/pdv/ProductDetailModal';
import type { CartItem, PaymentSplit } from '@/components/pdv/types';

// ── Modal Overlay (shared for cash register modals) ──
function ModalOverlay({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Main POS Component ──
export default function PDV() {
  const notify = useNotify();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const [createOrder, { isLoading: creating }] = useCreateAdminOrderMutation();
  const [createCustomer, { isLoading: creatingCustomer }] =
    useCreateCustomerMutation();
  const { data: cashRegister, refetch: refetchCashRegister } = useGetCashRegisterQuery(undefined, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  const [openRegister, { isLoading: openingRegister }] =
    useOpenCashRegisterMutation();
  const [closeRegister, { isLoading: closingRegister }] =
    useCloseCashRegisterMutation();
  const { data: tables = [] } = useGetTablesQuery();
  const { data: allOrders = [], refetch: refetchOrders } = useGetOrdersQuery(
    undefined,
    { pollingInterval: 5000, refetchOnMountOrArgChange: true },
  );
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);
  const { data: tenant } = useGetTenantBySlugQuery(tenantSlug!, {
    skip: !tenantSlug,
  });

  // Cash register state
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [pendingOrdersWarning, setPendingOrdersWarning] = useState('');
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const isCashRegisterOpen = !!cashRegister;

  // Product grid state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState('pickup');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    { method: 'cash', amount: 0 },
  ]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);
  const [pixPayloadStr, setPixPayloadStr] = useState('');

  // Visual feedback for add-to-cart
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // ── Derived data ──
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (p.is_active === false) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) || c.phone?.includes(q),
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  const subtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return sum + (item.unit_price + extrasTotal) * item.quantity;
  }, 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartQuantityByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((c) => {
      map[c.product_id] = (map[c.product_id] || 0) + c.quantity;
    });
    return map;
  }, [cart]);

  // ── PIX QR code generation ──
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
    })
      .then(setPixQrUrl)
      .catch(() => setPixQrUrl(null));
  }, [isPix, pixKey, total, tenant?.name]);

  // ── Print helper ──
  const printCashReceipt = (
    title: string,
    data: Record<string, string>,
  ) => {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write(
      '<html><head><title>' +
        title +
        '</title><style>body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:3px 0}.right{text-align:right}.bold{font-weight:bold}.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}</style></head><body>',
    );
    win.document.write(
      '<div class="center"><strong>' + title.toUpperCase() + '</strong></div>',
    );
    win.document.write(
      '<div class="center">' +
        new Date().toLocaleString('pt-BR') +
        '</div>',
    );
    win.document.write('<div class="line"></div>');
    win.document.write('<table>');
    for (const [k, v] of Object.entries(data)) {
      win.document.write(
        '<tr><td>' + k + '</td><td class="right">' + v + '</td></tr>',
      );
    }
    win.document.write('</table>');
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  // ── Cart operations ──
  const handleProductClick = useCallback(
    (product: any) => {
      const hasOptions =
        product.variations?.length > 0 ||
        product.extra_groups?.some((g: any) => g.extras?.length > 0);
      if (!hasOptions) {
        setCart((prev) => {
          const existing = prev.find(
            (item) => item.product_id === product.id && !item.variation_id,
          );
          if (existing)
            return prev.map((item) =>
              item === existing
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
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
        // Visual feedback
        setAddedProductId(product.id);
        setTimeout(() => setAddedProductId(null), 600);
      } else {
        setSelectedProduct(product);
      }
    },
    [],
  );

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => [...prev, item]);
    setAddedProductId(item.product_id);
    setTimeout(() => setAddedProductId(null), 600);
  }, []);

  const updateQuantity = (index: number, delta: number) =>
    setCart((prev) =>
      prev
        .map((item, i) =>
          i === index
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

  const removeFromCart = (index: number) =>
    setCart((prev) => prev.filter((_, i) => i !== index));

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setNotes('');
    setDeliveryNotes('');
    setChangeFor('');
    setSelectedTableId('');
    setPaymentSplits([{ method: 'cash', amount: 0 }]);
  }, []);

  const updatePaymentSplit = (index: number, field: string, value: any) =>
    setPaymentSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );

  const addPaymentSplit = () =>
    setPaymentSplits((prev) => [...prev, { method: 'pix', amount: 0 }]);

  const removePaymentSplit = (index: number) => {
    if (paymentSplits.length > 1)
      setPaymentSplits((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Order submission ──
  const handleSubmit = useCallback(async () => {
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
      is_paid: true,
      table_id:
        orderType === 'dine_in' && selectedTableId
          ? selectedTableId
          : undefined,
      notes: [notes, deliveryNotes].filter(Boolean).join(' | ') || undefined,
    };
    if (selectedCustomer) {
      data.customer_id = selectedCustomer.id;
      data.customer_name = selectedCustomer.name;
    }
    if (paymentSplits.length === 1) {
      data.payment_method = paymentSplits[0].method;
      if (paymentSplits[0].method === 'cash' && changeFor)
        data.change_for = parseFloat(changeFor);
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
      clearCart();
      setTimeout(() => setOrderSuccess(null), 4000);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao criar pedido.');
    }
  }, [
    cart,
    isCashRegisterOpen,
    orderType,
    selectedTableId,
    notes,
    deliveryNotes,
    selectedCustomer,
    paymentSplits,
    changeFor,
    total,
    createOrder,
    clearCart,
    notify,
  ]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Only allow Escape in inputs
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          if (selectedProduct) setSelectedProduct(null);
          if (showOpenRegister) setShowOpenRegister(false);
          if (showCloseRegister) setShowCloseRegister(false);
          if (closingSummary) setClosingSummary(null);
        }
        return;
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          if (cart.length > 0) handleSubmit();
          break;
        case 'F5':
          e.preventDefault();
          if (cart.length > 0) clearCart();
          break;
        case 'Escape':
          e.preventDefault();
          if (selectedProduct) setSelectedProduct(null);
          else if (showOpenRegister) setShowOpenRegister(false);
          else if (showCloseRegister) setShowCloseRegister(false);
          else if (closingSummary) setClosingSummary(null);
          break;
        case '1':
          if (cart.length > 0 && paymentSplits.length === 1) {
            updatePaymentSplit(0, 'method', 'pix');
          }
          break;
        case '2':
          if (cart.length > 0 && paymentSplits.length === 1) {
            updatePaymentSplit(0, 'method', 'credit_card');
          }
          break;
        case '3':
          if (cart.length > 0 && paymentSplits.length === 1) {
            updatePaymentSplit(0, 'method', 'debit_card');
          }
          break;
        case '4':
          if (cart.length > 0 && paymentSplits.length === 1) {
            updatePaymentSplit(0, 'method', 'cash');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart.length,
    paymentSplits.length,
    selectedProduct,
    showOpenRegister,
    showCloseRegister,
    closingSummary,
    handleSubmit,
    clearCart,
  ]);

  // ── Customer creation handler ──
  const handleCreateCustomer = async () => {
    try {
      const c = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      }).unwrap();
      setSelectedCustomer(c);
      setShowNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch {
      notify.error('Erro ao cadastrar cliente.');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">PDV</h1>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            {isCashRegisterOpen ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium text-success">
                  Caixa aberto
                </span>
                <span className="text-sm text-gray-400">
                  ({formatPrice(cashRegister.opening_balance)})
                </span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-sm font-medium text-danger">
                  Caixa fechado
                </span>
              </>
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-gray-400">
          <span className="bg-gray-100 px-2 py-1 rounded-lg font-mono">
            F2
          </span>
          <span>Finalizar</span>
          <span className="bg-gray-100 px-2 py-1 rounded-lg font-mono">
            F5
          </span>
          <span>Limpar</span>
          <span className="bg-gray-100 px-2 py-1 rounded-lg font-mono">
            1-4
          </span>
          <span>Pagamento</span>
        </div>

        <div>
          {isCashRegisterOpen ? (
            <button
              onClick={async () => {
                setPendingOrdersWarning('');
                const { data: freshOrders } = await refetchOrders();
                const pending = (freshOrders || []).filter((o: any) =>
                  ['pending', 'confirmed', 'preparing', 'ready'].includes(
                    o.status,
                  ),
                );
                if (pending.length > 0) {
                  setPendingOrdersWarning(
                    `Não é possível fechar o caixa com ${pending.length} pedido(s) pendente(s). Finalize ou cancele todos os pedidos antes de fechar.`,
                  );
                  setTimeout(() => setPendingOrdersWarning(''), 5000);
                  return;
                }
                setShowCloseRegister(true);
              }}
              className="text-sm font-medium text-gray-400 hover:text-gray-700 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Lock className="w-4 h-4" /> Fechar Caixa
            </button>
          ) : (
            <button
              onClick={() => setShowOpenRegister(true)}
              className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors active:scale-95 shadow-sm shadow-primary/30"
            >
              <Unlock className="w-4 h-4" /> Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* ── Open Register Modal ── */}
      <ModalOverlay
        open={showOpenRegister}
        onClose={() => setShowOpenRegister(false)}
        title="Abrir Caixa"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Valor de abertura (R$)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !openingRegister) {
                  try {
                    const bal = parseFloat(openingBalance) || 0;
                    await openRegister({ opening_balance: bal }).unwrap();
                    setShowOpenRegister(false);
                    setOpeningBalance('');
                    notify.success('Caixa aberto com sucesso!');
                    printCashReceipt('Abertura de Caixa', {
                      'Valor de abertura': 'R$ ' + bal.toFixed(2),
                    });
                  } catch (err: any) {
                    notify.error(err?.data?.message || 'Erro ao abrir o caixa');
                  }
                }
              }}
              placeholder="0.00"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            disabled={openingRegister}
            onClick={async () => {
              try {
                const bal = parseFloat(openingBalance) || 0;
                await openRegister({ opening_balance: bal }).unwrap();
                setShowOpenRegister(false);
                setOpeningBalance('');
                notify.success('Caixa aberto com sucesso!');
                printCashReceipt('Abertura de Caixa', {
                  'Valor de abertura': 'R$ ' + bal.toFixed(2),
                });
              } catch (err: any) {
                notify.error(err?.data?.message || 'Erro ao abrir o caixa');
              }
            }}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors active:scale-95 text-base"
          >
            {openingRegister ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </div>
      </ModalOverlay>

      {/* ── Close Register Modal ── */}
      <ModalOverlay
        open={showCloseRegister}
        onClose={() => setShowCloseRegister(false)}
        title="Fechar Caixa"
      >
        <div className="space-y-4">
          {cashRegister && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="text-gray-500">
                Abertura:{' '}
                <span className="font-medium text-gray-900">
                  {formatPrice(cashRegister.opening_balance)}
                </span>
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Valor em caixa (R$)
            </label>
            <input
              type="number"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !closingRegister) {
                  try {
                    const result = await closeRegister({
                      closing_balance: parseFloat(closingBalance) || 0,
                      notes: closingNotes || undefined,
                    }).unwrap();
                    setShowCloseRegister(false);
                    setClosingBalance('');
                    setClosingNotes('');
                    setClosingSummary(result);
                  } catch (err: any) {
                    notify.error(
                      err?.data?.message || 'Erro ao fechar caixa',
                    );
                  }
                }
              }}
              placeholder="0.00"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Observações
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Observações do fechamento..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            disabled={closingRegister}
            onClick={async () => {
              try {
                const result = await closeRegister({
                  closing_balance: parseFloat(closingBalance) || 0,
                  notes: closingNotes || undefined,
                }).unwrap();
                setShowCloseRegister(false);
                setClosingBalance('');
                setClosingNotes('');
                setClosingSummary(result);
              } catch (err: any) {
                notify.error(err?.data?.message || 'Erro ao fechar caixa');
              }
            }}
            className="w-full bg-danger hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors active:scale-95 text-base"
          >
            {closingRegister ? 'Fechando...' : 'Fechar Caixa'}
          </button>
        </div>
      </ModalOverlay>

      {/* ── Closing Summary Modal ── */}
      <ModalOverlay
        open={!!closingSummary}
        onClose={() => setClosingSummary(null)}
        title="Resumo do Caixa"
        className="max-w-md"
      >
        {closingSummary && (
          <>
            <div id="closing-summary-print">
              <div className="text-center mb-5">
                <p className="text-lg font-bold text-gray-900">
                  Fechamento de Caixa
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(closingSummary.closed_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Abertura</span>
                  <span className="font-medium">
                    {formatPrice(closingSummary.opening_balance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Fechamento</span>
                  <span className="font-medium">
                    {formatPrice(closingSummary.closing_balance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Pedidos</span>
                  <span className="font-bold">
                    {closingSummary.orders_count}
                  </span>
                </div>
                <div className="h-px bg-gray-100" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Vendas por método
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-success" /> Dinheiro
                    </span>
                    <span className="font-medium">
                      {formatPrice(closingSummary.total_cash)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" /> Crédito
                    </span>
                    <span className="font-medium">
                      {formatPrice(closingSummary.total_credit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary-dark" />{' '}
                      Débito
                    </span>
                    <span className="font-medium">
                      {formatPrice(closingSummary.total_debit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-primary" /> PIX
                    </span>
                    <span className="font-medium">
                      {formatPrice(closingSummary.total_pix)}
                    </span>
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total Geral</span>
                  <span className="text-primary">
                    {formatPrice(
                      Number(closingSummary.total_cash) +
                        Number(closingSummary.total_credit) +
                        Number(closingSummary.total_debit) +
                        Number(closingSummary.total_pix),
                    )}
                  </span>
                </div>
                {closingSummary.closing_notes && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-2">
                    <p className="text-sm text-gray-500">
                      {closingSummary.closing_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  const win = window.open('', '_blank', 'width=400,height=600');
                  if (!win) return;
                  win.document.write(
                    '<html><head><title>Fechamento de Caixa</title><style>body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:3px 0}.right{text-align:right}.bold{font-weight:bold}.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}</style></head><body>',
                  );
                  win.document.write(
                    '<div class="center"><strong>FECHAMENTO DE CAIXA</strong></div>',
                  );
                  win.document.write(
                    '<div class="center">' +
                      new Date(closingSummary.closed_at).toLocaleString(
                        'pt-BR',
                      ) +
                      '</div>',
                  );
                  win.document.write('<div class="line"></div>');
                  win.document.write('<table>');
                  win.document.write(
                    '<tr><td>Abertura</td><td class="right">R$ ' +
                      Number(closingSummary.opening_balance).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write(
                    '<tr><td>Fechamento</td><td class="right">R$ ' +
                      Number(closingSummary.closing_balance).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write(
                    '<tr><td>Pedidos</td><td class="right">' +
                      closingSummary.orders_count +
                      '</td></tr>',
                  );
                  win.document.write('</table>');
                  win.document.write('<div class="line"></div>');
                  win.document.write(
                    '<div class="bold">VENDAS POR METODO</div>',
                  );
                  win.document.write('<table>');
                  win.document.write(
                    '<tr><td>Dinheiro</td><td class="right">R$ ' +
                      Number(closingSummary.total_cash).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write(
                    '<tr><td>Crédito</td><td class="right">R$ ' +
                      Number(closingSummary.total_credit).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write(
                    '<tr><td>Débito</td><td class="right">R$ ' +
                      Number(closingSummary.total_debit).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write(
                    '<tr><td>PIX</td><td class="right">R$ ' +
                      Number(closingSummary.total_pix).toFixed(2) +
                      '</td></tr>',
                  );
                  win.document.write('</table>');
                  win.document.write('<div class="line"></div>');
                  const grandTotal =
                    Number(closingSummary.total_cash) +
                    Number(closingSummary.total_credit) +
                    Number(closingSummary.total_debit) +
                    Number(closingSummary.total_pix);
                  win.document.write(
                    '<table><tr class="bold"><td>TOTAL GERAL</td><td class="right">R$ ' +
                      grandTotal.toFixed(2) +
                      '</td></tr></table>',
                  );
                  if (closingSummary.closing_notes)
                    win.document.write(
                      '<div class="line"></div><div>Obs: ' +
                        closingSummary.closing_notes +
                        '</div>',
                    );
                  win.document.write('</body></html>');
                  win.document.close();
                  win.print();
                }}
                className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-xl transition-colors active:scale-95"
              >
                Imprimir
              </button>
              <button
                onClick={() => setClosingSummary(null)}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-xl transition-colors active:scale-95"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </ModalOverlay>

      {/* ── Product Detail Modal ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* ── Success Toast ── */}
      {orderSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <span className="font-semibold text-base">
            Pedido #{orderSuccess} criado!
          </span>
        </div>
      )}

      {/* ── Pending Orders Warning ── */}
      {pendingOrdersWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-danger text-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-lg">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{pendingOrdersWarning}</span>
        </div>
      )}

      {/* ── Main Content ── */}
      {!isCashRegisterOpen ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          <div className="w-28 h-28 rounded-3xl bg-primary-50 flex items-center justify-center">
            <Receipt className="w-14 h-14 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg text-gray-600">
              Para começar a efetuar vendas é preciso
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              abrir o caixa
            </p>
          </div>
          <button
            onClick={() => setShowOpenRegister(true)}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-10 rounded-xl flex items-center gap-2.5 transition-colors active:scale-95 text-lg shadow-sm shadow-primary/30"
          >
            <Unlock className="w-5 h-5" /> Abrir Caixa
          </button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Product Grid */}
          <ProductGrid
            products={filteredProducts}
            categories={categories}
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onProductClick={handleProductClick}
            cartQuantityByProduct={cartQuantityByProduct}
            addedProductId={addedProductId}
          />

          {/* RIGHT: Cart + Payment */}
          <Cart
            cart={cart}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            selectedTableId={selectedTableId}
            onTableChange={setSelectedTableId}
            tables={tables}
            deliveryNotes={deliveryNotes}
            onDeliveryNotesChange={setDeliveryNotes}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onClearCustomer={() => setSelectedCustomer(null)}
            showCustomerSearch={showCustomerSearch}
            onShowCustomerSearch={setShowCustomerSearch}
            customerSearch={customerSearch}
            onCustomerSearchChange={setCustomerSearch}
            filteredCustomers={filteredCustomers}
            showNewCustomer={showNewCustomer}
            onShowNewCustomer={setShowNewCustomer}
            newCustomerName={newCustomerName}
            onNewCustomerNameChange={setNewCustomerName}
            newCustomerPhone={newCustomerPhone}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            creatingCustomer={creatingCustomer}
            onCreateCustomer={handleCreateCustomer}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            subtotal={subtotal}
            total={total}
            itemCount={itemCount}
          >
            <PaymentSection
              paymentSplits={paymentSplits}
              onUpdateSplit={updatePaymentSplit}
              onAddSplit={addPaymentSplit}
              onRemoveSplit={removePaymentSplit}
              total={total}
              itemCount={itemCount}
              changeFor={changeFor}
              onChangeForUpdate={setChangeFor}
              notes={notes}
              onNotesChange={setNotes}
              isPix={isPix}
              pixQrUrl={pixQrUrl}
              pixPayloadStr={pixPayloadStr}
              pixKey={pixKey}
              onSubmit={handleSubmit}
              creating={creating}
              cartEmpty={cart.length === 0}
            />
          </Cart>
        </div>
      )}
    </div>
  );
}
