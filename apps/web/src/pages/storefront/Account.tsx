import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star,
  User,
  Phone,
  LogOut,
  Package,
  ChevronRight,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import Cookies from 'js-cookie';
import {
  useCustomerLoginMutation,
  useGetCustomerProfileQuery,
  useAddCustomerAddressMutation,
  useRemoveCustomerAddressMutation,
  useGetCustomerOrdersQuery,
  useGetPublicDeliveryZonesQuery,
} from '@/api/customerApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { customerLoginSuccess, customerLogout } from '@/store/slices/customerAuthSlice';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

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

export default function Account() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const customerAuth = useAppSelector((state) => state.customerAuth);

  const [customerLogin, { isLoading: authLoading }] = useCustomerLoginMutation();
  const { data: customerProfile } = useGetCustomerProfileQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const [addCustomerAddress] = useAddCustomerAddressMutation();
  const [removeCustomerAddress] = useRemoveCustomerAddressMutation();
  const { data: orders = [], isLoading: loadingOrders } = useGetCustomerOrdersQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const { data: deliveryZones = [] } = useGetPublicDeliveryZonesQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Address management state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');

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

  const customer = customerProfile || customerAuth.customer;

  const fetchViaCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setNewAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // Silently fail
    } finally {
      setCepLoading(false);
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));
    if (field === 'zip_code' && value.replace(/\D/g, '').length === 8) {
      fetchViaCep(value);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      await addCustomerAddress({
        slug: slug!,
        address: {
          label: newAddress.label || 'Meu Endereco',
          street: newAddress.street,
          number: newAddress.number,
          complement: newAddress.complement || null,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          state: newAddress.state,
          zipcode: newAddress.zip_code,
        },
      }).unwrap();

      setShowAddressForm(false);
      setNewAddress({
        label: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
      });
    } catch {
      // Error handled by RTK Query
    }
    setAddressLoading(false);
  };

  const handleRemoveAddress = async (id: string) => {
    if (window.confirm('Deseja realmente remover este endereco?')) {
      await removeCustomerAddress({ slug: slug!, addressId: id });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) return;
    setAuthError(null);
    try {
      const result = await customerLogin({
        phone: loginPhone.trim(),
        name: loginName.trim() || undefined,
        slug: slug!,
      }).unwrap();

      Cookies.set('customer_token', result.access_token, { expires: 30 });
      dispatch(customerLoginSuccess(result.customer));
    } catch (err: any) {
      setAuthError(err?.data?.message || 'Erro ao entrar. Tente novamente.');
    }
  };

  const handleLogout = () => {
    Cookies.remove('customer_token');
    dispatch(customerLogout());
  };

  // Not logged in: show login
  if (!customerAuth.isAuthenticated) {
    return (
      <div className="px-4 pt-6 pb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Minha Conta</h3>
            <p className="text-sm text-gray-500 mt-1">
              Entre com seu telefone para ver seus pedidos
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading || !loginPhone.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged in: show tabbed profile
  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {customer?.name || 'Cliente'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {customer?.phone ? formatPhone(customer.phone) : ''}
              </p>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-100">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">
                  {customer?.loyalty_points || 0} pontos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {(['profile', 'addresses', 'orders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'profile' ? 'Perfil' : tab === 'addresses' ? 'Enderecos' : 'Pedidos'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome</label>
            <p className="text-sm text-gray-900 font-medium">{customer?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone</label>
            <p className="text-sm text-gray-900 font-medium">{customer?.phone ? formatPhone(customer.phone) : '-'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail</label>
            <p className="text-sm text-gray-900 font-medium">{customer?.email || '-'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pontos de Fidelidade</label>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-700">{customer?.loyalty_points || 0} pontos</span>
            </div>
          </div>
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
              Meus Enderecos
            </h3>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="text-xs font-bold uppercase tracking-wider transition-colors"
              style={{ color: 'var(--tenant-primary)' }}
            >
              {showAddressForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          {showAddressForm ? (
            <form onSubmit={handleAddAddress} className="p-4 space-y-4 bg-gray-50/50">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do Local (Ex: Casa, Trabalho)</label>
                <input
                  type="text"
                  value={newAddress.label || ''}
                  onChange={(e) => handleAddressChange('label', e.target.value)}
                  placeholder="Ex: Minha Casa"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newAddress.zip_code}
                      onChange={(e) => handleAddressChange('zip_code', e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                      required
                    />
                    {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400" />}
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bairro</label>
                  <select
                    value={newAddress.neighborhood}
                    onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  >
                    <option value="">Selecionar</option>
                    {availableNeighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rua</label>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nr</label>
                  <input
                    type="text"
                    value={newAddress.number}
                    onChange={(e) => handleAddressChange('number', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Complemento</label>
                <input
                  type="text"
                  value={newAddress.complement}
                  onChange={(e) => handleAddressChange('complement', e.target.value)}
                  placeholder="Ex: Apto 101"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cidade</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 bg-gray-50 outline-none text-sm"
                    disabled
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">UF</label>
                  <input
                    type="text"
                    value={newAddress.state}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 bg-gray-50 outline-none text-sm"
                    disabled
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addressLoading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                {addressLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Endereco'}
              </button>
            </form>
          ) : (
            <div className="divide-y divide-gray-100">
              {customer?.addresses && customer.addresses.length > 0 ? (
                customer.addresses.map((addr: any) => (
                  <div key={addr.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">
                        {addr.label || 'Meu Endereco'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {addr.street}, {addr.number}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {addr.neighborhood} - {addr.city}/{addr.state}
                      </p>
                      {addr.complement && (
                        <p className="text-[11px] text-gray-400 italic">
                          {addr.complement}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAddress(addr.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">Nenhum endereco cadastrado</p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="text-xs font-bold mt-2"
                    style={{ color: 'var(--tenant-primary)' }}
                  >
                    Cadastrar o primeiro
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
              Meus Pedidos
            </h3>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum pedido ainda</p>
              <p className="text-sm text-gray-400 mt-1">
                Seus pedidos aparecerao aqui
              </p>
              <button
                onClick={() => navigate(`/${slug}/menu`)}
                className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                Ver cardapio
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((order: any) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/${slug}/order/${order.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        Pedido #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          STATUS_COLORS[order.status as OrderStatus] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[order.status as OrderStatus] || order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(order.created_at)}
                      </span>
                      <span className="font-medium text-gray-600">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}
