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
  Gift,
  Check,
  Copy,
  History,
  Ticket,
} from 'lucide-react';
import {
  useCustomerLoginMutation,
  useCustomerRegisterMutation,
  useGetCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
  useAddCustomerAddressMutation,
  useRemoveCustomerAddressMutation,
  useGetCustomerOrdersQuery,
  useGetPublicDeliveryZonesQuery,
  useGetLoyaltyRewardsQuery,
  useRedeemRewardMutation,
  useGetMyRedemptionsQuery,
} from '@/api/customerApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { customerLoginSuccess, customerLogout } from '@/store/slices/customerAuthSlice';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';
import { maskPhone, maskCep, unmaskDigits } from '@/utils/masks';

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
  const [customerRegister, { isLoading: registerLoading }] = useCustomerRegisterMutation();
  const [updateCustomerProfile] = useUpdateCustomerProfileMutation();
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
  const { data: loyaltyRewards = [] } = useGetLoyaltyRewardsQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const { data: redemptions = [] } = useGetMyRedemptionsQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const [redeemReward, { isLoading: isRedeeming }] = useRedeemRewardMutation();

  // Redeem states
  const [confirmReward, setConfirmReward] = useState<any>(null);
  const [redeemResult, setRedeemResult] = useState<{ reward: any; coupon_code: string; expires_at: string } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Login form state
  const [loginMode, setLoginMode] = useState<'phone' | 'email' | 'register'>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileCpf, setProfileCpf] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

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
  const [activeTab, setActiveTab] = useState<'profile' | 'rewards' | 'addresses' | 'orders'>('profile');

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

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      if (loginMode === 'register') {
        if (!loginName.trim() || !loginPhone.trim() || !loginPassword.trim()) return;
        if (loginPassword !== registerConfirmPassword) {
          setAuthError('As senhas nao coincidem.');
          return;
        }
        await customerRegister({
          slug: slug!,
          name: loginName.trim(),
          phone: unmaskDigits(loginPhone),
          email: loginEmail.trim() || undefined,
          password: loginPassword,
        }).unwrap();

        // Cookie is set by backend (httpOnly)
        // After register, login to get full customer data
        const loginResult = await customerLogin({
          phone: unmaskDigits(loginPhone),
          name: loginName.trim(),
          slug: slug!,
        }).unwrap();
        // Cookie is set by backend (httpOnly)
        dispatch(customerLoginSuccess(loginResult.customer));
        return;
      }

      let result;
      if (loginMode === 'email') {
        if (!loginEmail.trim() || !loginPassword.trim()) return;
        result = await customerLogin({
          email: loginEmail.trim(),
          password: loginPassword,
          slug: slug!,
        }).unwrap();
      } else {
        if (!loginPhone.trim() || !loginName.trim()) return;
        result = await customerLogin({
          phone: unmaskDigits(loginPhone),
          name: loginName.trim(),
          slug: slug!,
        }).unwrap();
      }

      // Cookie is set by backend (httpOnly)
      dispatch(customerLoginSuccess(result.customer));
    } catch (err: any) {
      setAuthError(err?.data?.message || 'Erro ao entrar. Tente novamente.');
    }
  };

  const handleSaveProfile = async () => {
    if (!slug) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const data: { name?: string; email?: string; password?: string; birth_date?: string; gender?: string; cpf?: string } = {};
      if (profileName.trim() && profileName.trim() !== customer?.name) data.name = profileName.trim();
      if (profileEmail.trim() && profileEmail.trim() !== customer?.email) data.email = profileEmail.trim();
      if (profilePassword.trim()) data.password = profilePassword.trim();
      if (profileBirthDate && profileBirthDate !== (customer?.birth_date || '')) data.birth_date = profileBirthDate;
      if (profileGender && profileGender !== (customer?.gender || '')) data.gender = profileGender;
      if (profileCpf.trim() && profileCpf.trim() !== (customer?.cpf || '')) data.cpf = profileCpf.trim();

      if (Object.keys(data).length === 0) {
        setProfileSaving(false);
        return;
      }

      await updateCustomerProfile({ slug, data }).unwrap();
      setProfilePassword('');
      setEditingProfile(false);
      setProfileSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err?.data?.message || 'Erro ao atualizar perfil.');
    }
    setProfileSaving(false);
  };

  const handleRedeemClick = (reward: any) => {
    setRedeemError(null);
    setRedeemResult(null);
    setConfirmReward(reward);
  };

  const handleConfirmRedeem = async () => {
    if (!confirmReward) return;
    setRedeemError(null);
    try {
      const result = await redeemReward({ slug: slug!, rewardId: confirmReward.id }).unwrap();
      setConfirmReward(null);
      setRedeemResult({
        reward: result.reward,
        coupon_code: result.redemption.coupon_code,
        expires_at: result.redemption.expires_at,
      });
    } catch (err: any) {
      setRedeemError(err?.data?.message || 'Erro ao resgatar recompensa.');
      setConfirmReward(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    dispatch(customerLogout());
  };

  const getRewardLabel = (reward: any) => {
    if (reward.reward_type === 'discount_percent') return `${reward.reward_value}% de desconto`;
    if (reward.reward_type === 'discount_fixed') return `R$ ${Number(reward.reward_value).toFixed(2)} de desconto`;
    return 'Produto gratis';
  };

  // Separate pending redemptions (active coupons)
  const pendingRedemptions = redemptions.filter((r: any) => r.status === 'pending');
  const pastRedemptions = redemptions.filter((r: any) => r.status !== 'pending');

  // Not logged in: show login
  if (!customerAuth.isAuthenticated) {
    return (
      <div className="px-4 pt-6 pb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--tenant-gradient)' }}
            >
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Minha Conta</h3>
            <p className="text-sm text-gray-500 mt-1">
              {loginMode === 'phone'
                ? 'Informe seu telefone para entrar ou criar sua conta'
                : loginMode === 'email'
                ? 'Entre com seu email e senha'
                : 'Crie sua conta com email e senha'}
            </p>
          </div>

          {/* Login mode toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => { setLoginMode('phone'); setAuthError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                loginMode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setLoginMode('email'); setAuthError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                loginMode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Email e Senha
            </button>
            <button
              onClick={() => { setLoginMode('register'); setAuthError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                loginMode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{authError}</p>
              </div>
            )}

            {loginMode === 'phone' ? (
              <>
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
                      autoFocus
                      required
                    />
                  </div>
                </div>

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
                      required
                    />
                  </div>
                </div>
              </>
            ) : loginMode === 'email' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>
              </>
            ) : (
              /* Register mode */
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
                      placeholder="Nome completo"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmar senha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={
                (authLoading || registerLoading) ||
                (loginMode === 'phone' ? (!loginPhone.trim() || !loginName.trim()) :
                 loginMode === 'email' ? (!loginEmail.trim() || !loginPassword.trim()) :
                 (!loginName.trim() || !loginPhone.trim() || !loginPassword.trim() || !registerConfirmPassword.trim()))
              }
              className="w-full py-3 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--tenant-gradient)' }}
            >
              {(authLoading || registerLoading) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {loginMode === 'register' ? 'Criando conta...' : 'Entrando...'}
                </>
              ) : (
                loginMode === 'register' ? 'Criar minha conta' : 'Entrar'
              )}
            </button>

            {loginMode === 'email' && (
              <p className="text-center text-sm text-gray-500">
                Nao tem conta?{' '}
                <button
                  type="button"
                  onClick={() => { setLoginMode('register'); setAuthError(null); }}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--tenant-primary)' }}
                >
                  Crie aqui
                </button>
              </p>
            )}
            {loginMode === 'register' && (
              <p className="text-center text-sm text-gray-500">
                Ja tem conta?{' '}
                <button
                  type="button"
                  onClick={() => { setLoginMode('email'); setAuthError(null); }}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--tenant-primary)' }}
                >
                  Entre aqui
                </button>
              </p>
            )}
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
            style={{ background: 'var(--tenant-gradient)' }}
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
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['profile', 'rewards', 'addresses', 'orders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'profile' ? 'Perfil' : tab === 'rewards' ? 'Fidelidade' : tab === 'addresses' ? 'Enderecos' : 'Pedidos'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">{profileSuccess}</p>
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{profileError}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {!editingProfile ? (
              <>
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
                  <p className="text-sm text-gray-900 font-medium">{customer?.email || <span className="text-gray-400 italic">Nao cadastrado</span>}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data de Nascimento</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {customer?.birth_date ? new Date(customer.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : <span className="text-gray-400 italic">-</span>}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sexo</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {customer?.gender === 'male' ? 'Masculino' : customer?.gender === 'female' ? 'Feminino' : customer?.gender === 'other' ? 'Outro' : <span className="text-gray-400 italic">-</span>}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CPF</label>
                  <p className="text-sm text-gray-900 font-medium">{customer?.cpf || <span className="text-gray-400 italic">-</span>}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Senha</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {customer?.password_hash ? '********' : <span className="text-gray-400 italic">Nao cadastrada</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pontos de Fidelidade</label>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-amber-700">{customer?.loyalty_points || 0} pontos</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingProfile(true);
                    setProfileName(customer?.name || '');
                    setProfileEmail(customer?.email || '');
                    setProfilePassword('');
                    setProfileBirthDate(customer?.birth_date || '');
                    setProfileGender(customer?.gender || '');
                    setProfileCpf(customer?.cpf || '');
                    setProfileError('');
                  }}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  Editar perfil
                </button>

                {!customer?.email && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-700">
                      <strong>Dica:</strong> Cadastre seu email e senha para poder entrar de qualquer dispositivo.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone</label>
                  <p className="text-sm text-gray-500 font-medium px-4 py-2.5 bg-gray-50 rounded-xl">
                    {customer?.phone ? formatPhone(customer.phone) : '-'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">Telefone nao pode ser alterado</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={profileBirthDate}
                      onChange={(e) => setProfileBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sexo</label>
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                      <option value="other">Outro</option>
                      <option value="prefer_not_to_say">Prefiro nao dizer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CPF</label>
                  <input
                    type="text"
                    value={profileCpf}
                    onChange={(e) => setProfileCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {customer?.password_hash ? 'Nova Senha (deixe vazio para manter)' : 'Criar Senha'}
                  </label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder={customer?.password_hash ? 'Deixe vazio para manter a atual' : 'Minimo 6 caracteres'}
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditingProfile(false); setProfileError(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--tenant-gradient)' }}
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {/* Points summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--tenant-gradient)' }}
                >
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{customer?.loyalty_points || 0}</p>
                  <p className="text-xs text-gray-500">pontos disponiveis</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Como ganhar</p>
                <p className="text-xs text-gray-600">1 ponto por R$1 gasto</p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {redeemError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{redeemError}</p>
            </div>
          )}

          {/* Active coupons (pending redemptions) */}
          {pendingRedemptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
                  Meus Cupons Ativos
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingRedemptions.map((r: any) => {
                  const isExpiringSoon = r.expires_at && (new Date(r.expires_at).getTime() - Date.now()) < 12 * 3600000;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {r.reward?.name || 'Recompensa'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isExpiringSoon ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {isExpiringSoon ? 'Expira em breve' : 'Ativo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between">
                          <code className="text-sm font-mono font-bold text-gray-800 tracking-wider">
                            {r.coupon_code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(r.coupon_code)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Valido ate {r.expires_at ? formatDateShort(r.expires_at) : '-'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rewards list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
                Recompensas Disponiveis
              </h3>
            </div>

            {loyaltyRewards.length === 0 ? (
              <div className="p-8 text-center">
                <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma recompensa disponivel</p>
                <p className="text-sm text-gray-400 mt-1">
                  Acumule pontos para resgatar recompensas futuras.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {loyaltyRewards.map((reward: any) => {
                  const canRedeem = (customer?.loyalty_points || 0) >= reward.points_required;
                  const pointsNeeded = reward.points_required - (customer?.loyalty_points || 0);
                  const progressPercent = Math.min(100, ((customer?.loyalty_points || 0) / reward.points_required) * 100);

                  return (
                    <div key={reward.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            canRedeem ? 'bg-amber-50' : 'bg-gray-50'
                          }`}
                        >
                          <Gift className={`w-5 h-5 ${canRedeem ? 'text-amber-500' : 'text-gray-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{reward.name}</p>
                          {reward.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{reward.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">{getRewardLabel(reward)}</p>

                          {/* Progress bar */}
                          {!canRedeem && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-gray-400">
                                  {customer?.loyalty_points || 0} / {reward.points_required} pontos
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Faltam {pointsNeeded}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${progressPercent}%`,
                                    background: 'var(--tenant-gradient)',
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {canRedeem && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="text-xs font-bold text-amber-700">{reward.points_required} pontos</span>
                              {reward.expiration_hours && (
                                <span className="text-[10px] text-gray-400 ml-2">
                                  Cupom valido por {reward.expiration_hours}h
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => canRedeem && handleRedeemClick(reward)}
                          disabled={!canRedeem}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                            canRedeem
                              ? 'text-white active:scale-95'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          style={canRedeem ? { background: 'var(--tenant-gradient)' } : undefined}
                        >
                          {canRedeem ? 'Resgatar' : `${pointsNeeded} pts`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redemption history */}
          {pastRedemptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  Historico de Resgates
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {pastRedemptions.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      r.status === 'used' ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      {r.status === 'used' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.reward?.name || 'Recompensa'}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatDateShort(r.created_at)} - {r.points_spent} pontos
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'used'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'used' ? 'Usado' : 'Expirado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      onChange={(e) => handleAddressChange('zip_code', maskCep(e.target.value))}
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
                style={{ background: 'var(--tenant-gradient)' }}
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
                style={{ background: 'var(--tenant-gradient)' }}
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

      {/* Confirmation Modal */}
      {confirmReward && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom">
            <div className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--tenant-gradient)', opacity: 0.1 }}
              >
                <Gift className="w-8 h-8" style={{ color: 'var(--tenant-primary)' }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmar Resgate</h3>
              <p className="text-sm text-gray-500 mb-4">
                Deseja resgatar <strong>{confirmReward.name}</strong>?
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Recompensa</span>
                  <span className="font-medium text-gray-900">{getRewardLabel(confirmReward)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Custo</span>
                  <span className="font-bold text-amber-700">{confirmReward.points_required} pontos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Saldo apos</span>
                  <span className="font-medium text-gray-900">
                    {(customer?.loyalty_points || 0) - confirmReward.points_required} pontos
                  </span>
                </div>
                {confirmReward.expiration_hours && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Validade do cupom</span>
                    <span className="font-medium text-gray-900">{confirmReward.expiration_hours}h</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Voce recebera um cupom para usar no proximo pedido. Esta acao nao pode ser desfeita.
              </p>
            </div>

            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setConfirmReward(null)}
                className="flex-1 py-3.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRedeem}
                disabled={isRedeeming}
                className="flex-1 py-3.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--tenant-gradient)' }}
              >
                {isRedeeming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar Resgate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Coupon Code */}
      {redeemResult && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-green-50">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Resgate Realizado!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Use o cupom abaixo no seu proximo pedido
              </p>

              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 mb-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Seu cupom</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                    {redeemResult.coupon_code}
                  </code>
                  <button
                    onClick={() => handleCopyCode(redeemResult.coupon_code)}
                    className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-xs text-green-600 mt-2">Copiado!</p>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Valido ate {redeemResult.expires_at ? formatDate(redeemResult.expires_at) : '-'}
              </p>
            </div>

            <div className="border-t border-gray-100">
              <button
                onClick={() => setRedeemResult(null)}
                className="w-full py-3.5 text-sm font-semibold transition-colors"
                style={{ color: 'var(--tenant-primary)' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
