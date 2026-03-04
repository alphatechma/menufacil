import { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useTenantStore } from '../store/tenantStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import type { Address, PaymentMethod, CustomerAddress } from '../types';

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

export function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { items, getSubtotal, getItemTotal, clear } = useCartStore();
  const { tenant } = useTenantStore();
  const { 
    isAuthenticated, 
    customer, 
    login, 
    isLoading: authLoading, 
    error: authError, 
    clearError,
    fetchProfile,
    addAddress,
    removeAddress,
  } = useAuthStore();

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');

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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [lookingUpFee, setLookingUpFee] = useState(false);
  const [zoneNotFound, setZoneNotFound] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const neighborhoodDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = getSubtotal();
  const total = subtotal + deliveryFee;

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const lookupDeliveryFee = useCallback(async (neighborhood: string) => {
    if (!neighborhood.trim()) {
      setDeliveryFee(0);
      setDeliveryTime('');
      setZoneNotFound(false);
      return;
    }
    setLookingUpFee(true);
    setZoneNotFound(false);
    try {
      const { data } = await api.get('/delivery-zones/by-neighborhood', {
        params: { neighborhood: neighborhood.trim() },
      });
      if (data && data.zone) {
        setDeliveryFee(Number(data.fee) || 0);
        setDeliveryTime(
          data.min_delivery_time && data.max_delivery_time
            ? `${data.min_delivery_time}-${data.max_delivery_time} min`
            : '',
        );
        setZoneNotFound(false);
      } else {
        setDeliveryFee(0);
        setDeliveryTime('');
        setZoneNotFound(true);
      }
    } catch {
      setDeliveryFee(0);
      setDeliveryTime('');
      setZoneNotFound(true);
    } finally {
      setLookingUpFee(false);
    }
  }, []);

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

  const fetchNeighborhoods = async () => {
    try {
      const { data } = await api.get('/delivery-zones');
      const neighborhoods: string[] = [];
      for (const zone of data) {
        if (zone.neighborhoods && zone.neighborhoods.length > 0) {
          neighborhoods.push(...zone.neighborhoods);
        } else if (zone.name) {
          neighborhoods.push(zone.name);
        }
      }
      setAvailableNeighborhoods([...new Set(neighborhoods)].sort());
    } catch {
      // Fallback: allow free text
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

  const handleSelectAddress = (addr: CustomerAddress) => {
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
      await removeAddress(id);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  useEffect(() => {
    // If user has addresses and none selected, select the default or first one
    if (customer?.addresses && customer.addresses.length > 0 && !selectedAddressId && !isAddingNewAddress) {
      const defaultAddr = customer.addresses.find(a => a.is_default) || customer.addresses[0];
      handleSelectAddress(defaultAddr);
    } else if ((!customer?.addresses || customer.addresses.length === 0) && isAuthenticated) {
      setIsAddingNewAddress(true);
    }
  }, [customer?.addresses, selectedAddressId, isAddingNewAddress, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (neighborhoodDebounce.current) clearTimeout(neighborhoodDebounce.current);
    };
  }, []);

  useEffect(() => {
    fetchNeighborhoods();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) return;
    clearError();
    await login(loginPhone.trim(), loginName.trim() || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.street || !address.number || !address.neighborhood || !address.city) {
      setError('Preencha todos os campos obrigatorios do endereco.');
      return;
    }

    if (zoneNotFound) {
      setError('O bairro informado nao esta em nenhuma zona de entrega. Verifique o nome do bairro.');
      return;
    }

    if (items.length === 0) {
      setError('Seu carrinho esta vazio.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If adding new address, save it first
      if (isAddingNewAddress && isAuthenticated) {
        await addAddress({
          label: address.label || 'Meu Endereco',
          street: address.street,
          number: address.number,
          complement: address.complement || null,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipcode: address.zip_code,
        });
      }

      const orderData = {
        items: items.map((item) => ({
          product_id: item.product_id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          extras: item.extras,
        })),
        address,
        payment_method: paymentMethod,
      };

      const { data } = await api.post('/orders', orderData);
      clear();
      navigate(`/${slug}/order/${data.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Erro ao criar pedido. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-gray-500 text-lg mb-4">Seu carrinho esta vazio</p>
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="btn-primary"
        >
          Ver cardapio
        </button>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
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
          <div className="card p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: 'var(--tenant-primary-light)' }}
              >
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Informe seu telefone
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Para finalizar o pedido, precisamos do seu numero
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{authError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="(11) 99999-1234"
                    className="input-field pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Seu nome <span className="text-gray-400">(opcional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || !loginPhone.trim()}
                className="btn-primary w-full text-center flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Continuar'
                )}
              </button>
            </form>

            {/* Cart summary */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                {items.length} {items.length === 1 ? 'item' : 'itens'} no carrinho
                {' • '}
                <span className="font-semibold text-gray-700">{formatPrice(subtotal)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Address Section */}
        <section className="card p-5">
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
                  const defaultAddr = customer.addresses?.find(a => a.is_default) || customer.addresses?.[0];
                  if (defaultAddr) handleSelectAddress(defaultAddr);
                } : handleAddNewAddress}
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--tenant-primary)' }}
              >
                {isAddingNewAddress ? 'Usar salvo' : 'Novo endereco'}
              </button>
            )}
          </div>

          {!isAddingNewAddress && customer?.addresses && customer.addresses.length > 0 ? (
            <div className="space-y-3">
              {customer.addresses.map((addr) => (
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
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificacao (Ex: Casa, Trabalho)
                </label>
                <input
                  type="text"
                  value={address.label}
                  onChange={(e) => handleAddressChange('label', e.target.value)}
                  placeholder="Ex: Minha Casa"
                  className="input-field"
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
                    onChange={(e) => handleAddressChange('zip_code', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="input-field"
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
                    onChange={(e) =>
                      handleAddressChange('street', e.target.value)
                    }
                    placeholder="Nome da rua"
                    className="input-field"
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
                    onChange={(e) =>
                      handleAddressChange('number', e.target.value)
                    }
                    placeholder="123"
                    className="input-field"
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
                  onChange={(e) =>
                    handleAddressChange('complement', e.target.value)
                  }
                  placeholder="Apto, bloco, etc."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <select
                  value={address.neighborhood}
                  onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                  className="input-field"
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
                    {deliveryTime && ` • ${deliveryTime}`}
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
                    onChange={(e) =>
                      handleAddressChange('city', e.target.value)
                    }
                    placeholder="Cidade"
                    className="input-field"
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
                    onChange={(e) =>
                      handleAddressChange('state', e.target.value)
                    }
                    placeholder="UF"
                    maxLength={2}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Payment Method */}
        <section className="card p-5">
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
                    onChange={() => setPaymentMethod(method.value)}
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
        </section>

        {/* Order Summary */}
        <section className="card p-5">
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
              {items.map((item, index) => (
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
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full text-center flex items-center justify-center gap-2"
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
