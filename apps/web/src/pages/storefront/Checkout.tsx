import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  QrCode,
  Banknote,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Phone,
  User,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Tag,
  Check,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  Mail,
  Lock,
  ShoppingCart,
} from 'lucide-react';
import {
  useCustomerLoginMutation,
  useGetCustomerProfileQuery,
  useAddCustomerAddressMutation,
  useRemoveCustomerAddressMutation,
  useCreateOrderMutation,
  useGetPublicDeliveryZonesQuery,
  useLazyValidateCouponQuery,
  useGetCustomerOrdersQuery,
} from '@/api/customerApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { customerLoginSuccess } from '@/store/slices/customerAuthSlice';
import { clearCart, setOrderType, selectOrderType, selectTableId, selectTableSessionId, selectTableNumber } from '@/store/slices/cartSlice';
import type { OrderMode } from '@/store/slices/cartSlice';
import { formatPrice } from '@/utils/formatPrice';
import { maskPhone, maskCep, unmaskDigits } from '@/utils/masks';

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';

interface Address {
  label?: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: typeof CreditCard;
  description: string;
}[] = [
  {
    value: 'pix',
    label: 'PIX',
    icon: QrCode,
    description: 'Pagamento instantaneo',
  },
  {
    value: 'credit_card',
    label: 'Cartao de Credito',
    icon: CreditCard,
    description: 'Visa, Mastercard, Elo',
  },
  {
    value: 'debit_card',
    label: 'Cartao de Debito',
    icon: CreditCard,
    description: 'Visa, Mastercard, Elo',
  },
  {
    value: 'cash',
    label: 'Dinheiro',
    icon: Banknote,
    description: 'Pagamento na entrega',
  },
];

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const cartItems = useAppSelector((state) => state.cart.items);
  const customerAuth = useAppSelector((state) => state.customerAuth);
  const tenant = useAppSelector((state) => state.tenant.tenant);
  const orderType = useAppSelector(selectOrderType);
  const tableId = useAppSelector(selectTableId);
  const tableSessionId = useAppSelector(selectTableSessionId);
  const tableNumber = useAppSelector(selectTableNumber);

  // Determine available order modes from tenant
  const orderModes = tenant?.order_modes || { delivery: true, pickup: false, dine_in: false };
  const availableModes: { key: OrderMode; label: string; icon: typeof Truck }[] = [
    ...(orderModes.delivery ? [{ key: 'delivery' as OrderMode, label: 'Entrega', icon: Truck }] : []),
    ...(orderModes.pickup ? [{ key: 'pickup' as OrderMode, label: 'Retirada', icon: ShoppingBag }] : []),
    ...(orderModes.dine_in && tableId ? [{ key: 'dine_in' as OrderMode, label: 'Mesa', icon: UtensilsCrossed }] : []),
  ];

  // Auto-select if only one mode is available
  const effectiveOrderType = availableModes.length === 1 ? availableModes[0].key : orderType;
  const isDelivery = effectiveOrderType === 'delivery';

  const [customerLogin, { isLoading: authLoading }] = useCustomerLoginMutation();
  const { data: customerProfile } = useGetCustomerProfileQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const [addCustomerAddress] = useAddCustomerAddressMutation();
  const [removeCustomerAddress] = useRemoveCustomerAddressMutation();
  const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();
  const { data: deliveryZones = [] } = useGetPublicDeliveryZonesQuery(
    { slug: slug! },
    { skip: !slug },
  );
  const [validateCoupon] = useLazyValidateCouponQuery();

  // Login form state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Previous orders
  const { data: previousOrders } = useGetCustomerOrdersQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );

  // Address state
  const [address, setAddress] = useState<Address>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Payment & order
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [lookingUpFee, setLookingUpFee] = useState(false);
  const [zoneNotFound, setZoneNotFound] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  const neighborhoodDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return sum + (item.unit_price + extrasTotal) * item.quantity;
  }, 0);
  const effectiveDeliveryFee = isDelivery ? deliveryFee : 0;
  const total = subtotal + effectiveDeliveryFee - couponDiscount;

  // Get item total
  const getItemTotal = (item: typeof cartItems[0]) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return (item.unit_price + extrasTotal) * item.quantity;
  };

  // Extract available neighborhoods from delivery zones
  const availableNeighborhoods: string[] = (() => {
    const neighborhoods: string[] = [];
    for (const zone of deliveryZones) {
      if (zone.neighborhoods && zone.neighborhoods.length > 0) {
        neighborhoods.push(...zone.neighborhoods);
      } else if (zone.name) {
        neighborhoods.push(zone.name);
      }
    }
    return [...new Set(neighborhoods)].sort();
  })();

  const lookupDeliveryFee = useCallback((neighborhood: string) => {
    if (!neighborhood.trim()) {
      setDeliveryFee(0);
      setDeliveryTime('');
      setZoneNotFound(false);
      return;
    }
    setLookingUpFee(true);
    setZoneNotFound(false);

    // Find matching zone from already-fetched delivery zones
    const normalizedNeighborhood = neighborhood.trim().toLowerCase();
    let matchedZone: any = null;
    for (const zone of deliveryZones) {
      const zoneNeighborhoods = zone.neighborhoods || [];
      if (zoneNeighborhoods.some((n: string) => n.toLowerCase() === normalizedNeighborhood)) {
        matchedZone = zone;
        break;
      }
      if (zone.name && zone.name.toLowerCase() === normalizedNeighborhood) {
        matchedZone = zone;
        break;
      }
    }

    if (matchedZone) {
      setDeliveryFee(Number(matchedZone.fee || matchedZone.delivery_fee) || 0);
      setDeliveryTime(
        matchedZone.min_delivery_time && matchedZone.max_delivery_time
          ? `${matchedZone.min_delivery_time}-${matchedZone.max_delivery_time} min`
          : '',
      );
      setZoneNotFound(false);
    } else {
      setDeliveryFee(0);
      setDeliveryTime('');
      setZoneNotFound(true);
    }
    setLookingUpFee(false);
  }, [deliveryZones]);

  const fetchViaCep = async (cep: string) => {
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // Silently fail - user can fill manually
    } finally {
      setCepLoading(false);
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (field === 'zip_code') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchViaCep(cleanCep);
      }
    }
    if (field === 'neighborhood') {
      if (neighborhoodDebounce.current) clearTimeout(neighborhoodDebounce.current);
      lookupDeliveryFee(value);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setIsAddingNewAddress(false);
    setAddress({
      label: addr.label || '',
      street: addr.street,
      number: addr.number,
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zip_code: addr.zipcode,
    });
    lookupDeliveryFee(addr.neighborhood);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon({ slug: slug!, code: couponCode.trim(), total: subtotal }).unwrap();
      setCouponDiscount(result.discount);
      setAppliedCoupon(couponCode.trim().toUpperCase());
    } catch (err: any) {
      setCouponError(err?.data?.message || 'Cupom invalido');
      setCouponDiscount(0);
      setAppliedCoupon(null);
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handleAddNewAddress = () => {
    setSelectedAddressId(null);
    setIsAddingNewAddress(true);
    setAddress({
      label: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
    });
    setDeliveryFee(0);
    setZoneNotFound(false);
  };

  const handleRemoveSavedAddress = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja remover este endereco?')) {
      await removeCustomerAddress({ slug: slug!, addressId: id });
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
        setAddress({
          label: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zip_code: '',
        });
      }
    }
  };

  // Auto-select address when profile loads
  useEffect(() => {
    if (customerProfile?.addresses && customerProfile.addresses.length > 0 && !selectedAddressId && !isAddingNewAddress) {
      const defaultAddr = customerProfile.addresses.find((a: any) => a.is_default) || customerProfile.addresses[0];
      handleSelectAddress(defaultAddr);
    } else if ((!customerProfile?.addresses || customerProfile.addresses.length === 0) && customerAuth.isAuthenticated) {
      setIsAddingNewAddress(true);
    }
  }, [customerProfile?.addresses, selectedAddressId, isAddingNewAddress, customerAuth.isAuthenticated]);

  useEffect(() => {
    return () => {
      if (neighborhoodDebounce.current) clearTimeout(neighborhoodDebounce.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authTab === 'login') {
        // Email + password login
        if (!loginEmail.trim() || !loginPassword.trim()) return;
        const result = await customerLogin({
          email: loginEmail.trim(),
          password: loginPassword,
          slug: slug!,
        }).unwrap();
        dispatch(customerLoginSuccess(result.customer));
      } else {
        // Quick register by phone + name (auto-creates)
        if (!loginPhone.trim() || !loginName.trim()) return;
        const result = await customerLogin({
          phone: unmaskDigits(loginPhone),
          name: loginName.trim(),
          slug: slug!,
        }).unwrap();
        dispatch(customerLoginSuccess(result.customer));
      }
    } catch (err: any) {
      setAuthError(err?.data?.message || 'Erro ao entrar. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isDelivery) {
      if (!address.street || !address.number || !address.neighborhood || !address.city) {
        setError('Preencha todos os campos obrigatorios do endereco.');
        return;
      }

      if (zoneNotFound) {
        setError('O bairro informado nao esta em nenhuma zona de entrega. Verifique o nome do bairro.');
        return;
      }
    }

    if (cartItems.length === 0) {
      setError('Seu carrinho esta vazio.');
      return;
    }

    try {
      // If adding new address, save it first
      if (isAddingNewAddress && customerAuth.isAuthenticated) {
        await addCustomerAddress({
          slug: slug!,
          address: {
            label: address.label || 'Meu Endereco',
            street: address.street,
            number: address.number,
            complement: address.complement || null,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zipcode: address.zip_code,
          },
        });
      }

      const changeFor = paymentMethod === 'cash' && needsChange && parseFloat(changeAmount) > total
        ? parseFloat(changeAmount)
        : undefined;

      const orderData = {
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          variation_id: item.variation_id,
          variation_ids: item.variation_ids,
          variation_quantities: item.variation_quantities,
          quantity: item.quantity,
          notes: item.notes,
          extras: item.extras,
        })),
        order_type: effectiveOrderType,
        address_id: isDelivery ? selectedAddressId : undefined,
        address: isDelivery ? (selectedAddressId ? undefined : address) : undefined,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon || undefined,
        change_for: changeFor,
        table_id: tableId || undefined,
        table_session_id: tableSessionId || undefined,
        customer_name: effectiveOrderType === 'dine_in' && customerName.trim() ? customerName.trim() : undefined,
      };

      const result = await createOrder({ slug: slug!, data: orderData }).unwrap();
      dispatch(clearCart());
      navigate(`/${slug}/order/${result.id}`);
    } catch (err: any) {
      setError(
        err?.data?.message ||
          'Erro ao criar pedido. Tente novamente.',
      );
    }
  };

  // Block checkout if store is closed
  if (tenant && !tenant.is_open) {
    return (
      <div className="px-4 pt-8 pb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Clock className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Estamos fechados</h2>
          <p className="text-sm text-gray-500 mb-2">
            No momento nao estamos recebendo pedidos.
          </p>
          {tenant.next_open_label && (
            <p className="text-sm font-semibold mb-6" style={{ color: 'var(--tenant-primary)' }}>
              {tenant.next_open_label}
            </p>
          )}
          {!tenant.next_open_label && <div className="mb-6" />}
          <button
            onClick={() => navigate(`/${slug}`)}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'var(--tenant-gradient)' }}
          >
            Voltar ao inicio
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-gray-500 text-lg mb-4">Seu carrinho esta vazio</p>
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="px-6 py-3 rounded-xl text-white font-semibold transition-colors"
          style={{ background: 'var(--tenant-gradient)' }}
        >
          Ver cardapio
        </button>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!customerAuth.isAuthenticated) {
    const isLoginDisabled = authTab === 'login'
      ? authLoading || !loginEmail.trim() || !loginPassword.trim()
      : authLoading || !loginPhone.trim() || !loginName.trim();

    return (
      <div className="pb-6">
        {/* Header */}
        <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Identificacao</h2>
        </div>

        <div className="px-4 pt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--tenant-primary-light)' }}
              >
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Identifique-se para continuar
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Entre com sua conta ou cadastre-se rapidamente
              </p>
            </div>

            {/* Auth Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setAuthError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authTab === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Cadastro rapido
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authTab === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Ja tenho conta
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{authError}</p>
                </div>
              )}

              {authTab === 'register' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Seu nome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="Como podemos te chamar?"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(maskPhone(e.target.value))}
                        placeholder="(11) 99999-1234"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Voce podera cadastrar uma senha depois na sua conta
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoginDisabled}
                className="w-full py-3 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--tenant-gradient)' }}
              >
                {authLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : authTab === 'register' ? (
                  'Continuar'
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Cart summary */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no carrinho
                {' \u2022 '}
                <span className="font-semibold text-gray-700">{formatPrice(subtotal)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const customer = customerProfile || customerAuth.customer;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Finalizar Pedido</h2>
        </div>
        {customer && (
          <span className="text-sm text-gray-500">
            Ola, <span className="font-medium text-gray-700">{customer.name}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 pt-4">
        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Order Mode Selection */}
        {availableModes.length > 1 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">Como deseja receber?</h3>
            <div className="grid grid-cols-2 gap-3">
              {availableModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = effectiveOrderType === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => dispatch(setOrderType(mode.key))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: isSelected ? 'var(--tenant-primary)' : '#9CA3AF' }}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Pickup info */}
        {effectiveOrderType === 'pickup' && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
              <h3 className="font-bold text-gray-900">Retirada no balcao</h3>
            </div>
            <p className="text-sm text-gray-600">
              Retire seu pedido em: <span className="font-medium text-gray-900">{tenant?.address || 'Endereco do restaurante'}</span>
            </p>
          </section>
        )}

        {/* Dine-in info */}
        {effectiveOrderType === 'dine_in' && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
              <h3 className="font-bold text-gray-900">Consumo no local</h3>
            </div>
            {tableNumber && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-500">Mesa</span>
                <span className="text-lg font-bold text-gray-900">{tableNumber}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu nome <span className="text-gray-400 font-normal">(para a comanda)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Joao"
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[var(--tenant-primary)] transition-colors"
              />
            </div>
          </section>
        )}

        {/* Previous Orders */}
        {previousOrders && previousOrders.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
              <h3 className="font-bold text-gray-900">Pedidos anteriores</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {previousOrders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.product?.name || i.product_name || 'Produto'}`).join(', ') || `Pedido #${order.id.slice(-6)}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 ml-3 whitespace-nowrap">
                    {formatPrice(Number(order.total || 0))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Address Section - only for delivery */}
        {isDelivery && <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin
                className="w-5 h-5"
                style={{ color: 'var(--tenant-primary)' }}
              />
              <h3 className="font-bold text-gray-900">Endereco de entrega</h3>
            </div>
            {customer?.addresses && customer.addresses.length > 0 && (
              <button
                type="button"
                onClick={isAddingNewAddress ? () => {
                  const defaultAddr = customer.addresses?.find((a: any) => a.is_default) || customer.addresses?.[0];
                  if (defaultAddr) handleSelectAddress(defaultAddr);
                } : handleAddNewAddress}
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--tenant-primary)' }}
              >
                {isAddingNewAddress ? 'Usar salvo' : 'Novo endereco'}
              </button>
            )}
          </div>

          {/* Saved addresses */}
          {customer?.addresses && customer.addresses.length > 0 && !isAddingNewAddress && (
            <div className="space-y-3">
              {customer.addresses.map((addr: any) => (
                <div
                  key={addr.id}
                  onClick={() => handleSelectAddress(addr)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        {addr.label || 'Meu Endereco'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {addr.street}, {addr.number}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {addr.neighborhood} - {addr.city}/{addr.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedAddress(e, addr.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === addr.id
                            ? 'border-[var(--tenant-primary)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedAddressId === addr.id && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--tenant-primary)' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddNewAddress}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-[var(--tenant-primary)] hover:border-[var(--tenant-primary)] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Adicionar outro endereco</span>
              </button>
            </div>
          )}

          {/* New address form — only when no saved addresses OR user clicked "Novo endereco" */}
          {(isAddingNewAddress || !customer?.addresses || customer.addresses.length === 0) && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificacao (Ex: Casa, Trabalho)
                </label>
                <input
                  type="text"
                  value={address.label || ''}
                  onChange={(e) => handleAddressChange('label', e.target.value)}
                  placeholder="Ex: Minha Casa"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={address.zip_code}
                    onChange={(e) => handleAddressChange('zip_code', maskCep(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rua <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    placeholder="Nome da rua"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.number}
                    onChange={(e) => handleAddressChange('number', e.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={address.complement}
                  onChange={(e) => handleAddressChange('complement', e.target.value)}
                  placeholder="Apto, bloco, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <select
                  value={address.neighborhood}
                  onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  required
                >
                  <option value="">Selecione o bairro</option>
                  {availableNeighborhoods.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {lookingUpFee && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculando taxa de entrega...
                  </p>
                )}
                {!lookingUpFee && zoneNotFound && address.neighborhood.trim() && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Bairro nao atendido. Verifique o nome ou entre em contato.
                  </p>
                )}
                {!lookingUpFee && !zoneNotFound && deliveryFee > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Entrega: {formatPrice(deliveryFee)}
                    {deliveryTime && ` \u2022 ${deliveryTime}`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="Cidade"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </section>}

        {/* Payment Method */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard
              className="w-5 h-5"
              style={{ color: 'var(--tenant-primary)' }}
            />
            <h3 className="font-bold text-gray-900">Forma de pagamento</h3>
          </div>

          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.value;
              return (
                <label
                  key={method.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={isSelected}
                    onChange={() => {
                      setPaymentMethod(method.value);
                      if (method.value !== 'cash') {
                        setNeedsChange(false);
                        setChangeAmount('');
                      }
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-[var(--tenant-primary)]'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: 'var(--tenant-primary)' }}
                      />
                    )}
                  </div>
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {method.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {method.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Change section for cash */}
          {paymentMethod === 'cash' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">Precisa de troco?</p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setNeedsChange(false); setChangeAmount(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    !needsChange
                      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 text-[var(--tenant-primary)]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Nao preciso
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsChange(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    needsChange
                      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 text-[var(--tenant-primary)]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Sim, preciso
                </button>
              </div>

              {needsChange && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Troco para quanto?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={total}
                      value={changeAmount}
                      onChange={(e) => setChangeAmount(e.target.value)}
                      placeholder={formatPrice(Math.ceil(total / 10) * 10).replace('R$\u00a0', '')}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[var(--tenant-primary)] transition-colors"
                    />
                  </div>
                  {parseFloat(changeAmount) > 0 && parseFloat(changeAmount) > total && (
                    <p className="text-xs font-medium mt-2" style={{ color: 'var(--tenant-primary)' }}>
                      Troco: {formatPrice(parseFloat(changeAmount) - total)}
                    </p>
                  )}
                  {parseFloat(changeAmount) > 0 && parseFloat(changeAmount) <= total && (
                    <p className="text-xs font-medium text-red-500 mt-2">
                      O valor deve ser maior que o total do pedido ({formatPrice(total)})
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Coupon */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag
              className="w-5 h-5"
              style={{ color: 'var(--tenant-primary)' }}
            />
            <h3 className="font-bold text-gray-900">Cupom de desconto</h3>
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">{appliedCoupon}</span>
                <span className="text-xs text-green-600">-{formatPrice(couponDiscount)}</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Remover
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Digite o codigo"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  style={{ background: 'var(--tenant-gradient)' }}
                >
                  {couponLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Aplicar'
                  )}
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {couponError}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Order Summary */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <button
            type="button"
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="font-bold text-gray-900">Resumo do pedido</h3>
            {showOrderSummary ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showOrderSummary && (
            <div className="mt-4 space-y-3">
              {cartItems.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-gray-800 font-medium">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.variation_name && (
                      <p className="text-xs text-gray-400">
                        {item.variation_name}
                      </p>
                    )}
                    {item.extras.length > 0 && (
                      <p className="text-xs text-gray-400">
                        + {item.extras.map((e) => e.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-700 font-medium whitespace-nowrap">
                    {formatPrice(getItemTotal(item))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxa de entrega</span>
                <span>
                  {lookingUpFee ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : zoneNotFound && address.neighborhood.trim() ? (
                    <span className="text-red-500 font-medium text-xs">Bairro nao atendido</span>
                  ) : deliveryFee === 0 ? (
                    <span className="text-green-600 font-medium">Gratis</span>
                  ) : (
                    formatPrice(deliveryFee)
                  )}
                </span>
              </div>
            )}
            {!isDelivery && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{effectiveOrderType === 'pickup' ? 'Retirada' : 'Mesa'}</span>
                <span className="text-green-600 font-medium">Sem taxa</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto ({appliedCoupon})</span>
                <span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            {deliveryTime && !lookingUpFee && !zoneNotFound && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Tempo estimado</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {deliveryTime}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {paymentMethod === 'cash' && needsChange && parseFloat(changeAmount) > total && (
              <div className="flex justify-between text-sm pt-1">
                <span className="text-gray-500">Troco para {formatPrice(parseFloat(changeAmount))}</span>
                <span className="font-semibold" style={{ color: 'var(--tenant-primary)' }}>
                  {formatPrice(parseFloat(changeAmount) - total)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--tenant-gradient)' }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processando...
            </>
          ) : (
            <>Confirmar Pedido - {formatPrice(total)}</>
          )}
        </button>
      </form>
    </div>
  );
}
