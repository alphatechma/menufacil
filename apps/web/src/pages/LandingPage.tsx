import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ClipboardList,
  Monitor,
  Truck,
  Ticket,
  Heart,
  BarChart3,
  Users,
  Check,
  X,
  Loader2,
  ArrowRight,
  Star,
  Sparkles,
  Share2,
  Smartphone,
  ShoppingBag,
  QrCode,
  Flame,
  Pizza,
  Fish,
  Salad,
  Coffee,
  Cake,
  Sandwich,
  IceCream,
  Menu,
  CreditCard,
  Printer,
  MapPin,
  Tags,
  Shield,
  Zap,
  MessageCircle,
  ChevronUp,
  Eye,
  EyeOff,
  CalendarCheck,
  Map,
} from 'lucide-react';
import {
  useGetPlansPublicQuery,
  useCheckSlugAvailabilityQuery,
  useRegisterTenantMutation,
} from '@/api/customerApi';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  modules: string[];
  max_users: number;
  description?: string;
}

const BUSINESS_TYPES = [
  { icon: Flame, label: 'Hamburgueria' },
  { icon: Pizza, label: 'Pizzaria' },
  { icon: Fish, label: 'Sushi' },
  { icon: IceCream, label: 'Acaiteria' },
  { icon: Coffee, label: 'Cafeteria' },
  { icon: Cake, label: 'Padaria' },
  { icon: Sandwich, label: 'Lanchonete' },
  { icon: Salad, label: 'Marmitaria' },
  { icon: UtensilsCrossed, label: 'Restaurante' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Share2,
    title: 'Compartilhe seu link',
    description: 'Divulgue seu cardapio digital nas redes sociais, WhatsApp e mesas com QR Code.',
  },
  {
    step: '02',
    icon: Smartphone,
    title: 'Cliente faz o pedido',
    description: 'Seu cliente acessa o cardapio, escolhe os itens e faz o pedido pelo celular.',
  },
  {
    step: '03',
    icon: ShoppingBag,
    title: 'Gerencie e entregue',
    description: 'Receba os pedidos organizados, prepare e despache com controle total.',
  },
];

const ALL_FEATURES = [
  { icon: UtensilsCrossed, title: 'Cardapio Digital', desc: 'Cardapio completo com fotos, categorias e extras personalizaveis.' },
  { icon: ClipboardList, title: 'Gestao de Pedidos', desc: 'Receba e acompanhe pedidos em tempo real do inicio ao fim.' },
  { icon: Monitor, title: 'KDS - Tela da Cozinha', desc: 'Display de producao para cozinha com atualizacao automatica.' },
  { icon: Truck, title: 'Delivery Completo', desc: 'Zonas de entrega, taxas dinamicas e rastreamento de pedidos.' },
  { icon: QrCode, title: 'QR Code para Mesas', desc: 'Clientes escaneiam e pedem direto da mesa, sem fila.' },
  { icon: CreditCard, title: 'Pagamento Online', desc: 'Aceite PIX, cartao e dinheiro com controle automatico.' },
  { icon: Ticket, title: 'Cupons de Desconto', desc: 'Crie promocoes e cupons para atrair e fidelizar clientes.' },
  { icon: Heart, title: 'Programa de Fidelidade', desc: 'Pontos e recompensas automaticas para clientes recorrentes.' },
  { icon: Printer, title: 'Impressao Termica', desc: 'Imprima pedidos direto na impressora da cozinha.' },
  { icon: BarChart3, title: 'Relatorios Detalhados', desc: 'Dashboard com metricas de vendas, produtos e desempenho.' },
  { icon: MapPin, title: 'Areas de Entrega', desc: 'Defina zonas com taxas e tempos de entrega personalizados.' },
  { icon: Tags, title: 'Grupos de Extras', desc: 'Adicionais, bordas, tamanhos e complementos flexiveis.' },
  { icon: Users, title: 'Multi-usuario', desc: 'Equipe com diferentes niveis de acesso e permissoes.' },
  { icon: Shield, title: 'Painel Seguro', desc: 'Acesso protegido com autenticacao JWT e controle de sessao.' },
  { icon: Zap, title: 'Tempo Real', desc: 'Atualizacoes instantaneas via WebSocket para pedidos e KDS.' },
  { icon: Menu, title: 'Horario de Funcionamento', desc: 'Configure dias e horarios de atendimento automaticamente.' },
  { icon: ShoppingBag, title: 'Retirada no Balcao', desc: 'Clientes pedem online e retiram no local, sem taxa de entrega.' },
  { icon: UtensilsCrossed, title: 'Atendimento Presencial', desc: 'Mesas com QR code, comanda digital e divisao de conta.' },
  { icon: CalendarCheck, title: 'Reserva de Mesa', desc: 'Clientes solicitam reserva online, restaurante aprova.' },
  { icon: Map, title: 'Mapa do Salao', desc: 'Visualize suas mesas em tempo real com layout interativo.' },
];

const MODULE_LABELS: Record<string, string> = {
  menu: 'Cardapio Digital',
  orders: 'Gestao de Pedidos',
  customers: 'Clientes',
  kds: 'KDS - Cozinha',
  delivery: 'Delivery',
  coupons: 'Cupons',
  loyalty: 'Fidelidade',
  reports: 'Relatorios',
  multi_user: 'Multi-usuario',
};

const FALLBACK_PLANS: Plan[] = [
  { id: 'basic', name: 'Basico', slug: 'basic', price: 99, max_users: 2, modules: ['menu', 'orders', 'customers'] },
  { id: 'pro', name: 'Pro', slug: 'pro', price: 199, max_users: 5, modules: ['menu', 'orders', 'customers', 'kds', 'delivery', 'coupons', 'reports'] },
  { id: 'enterprise', name: 'Enterprise', slug: 'enterprise', price: 399, max_users: 999, modules: ['menu', 'orders', 'customers', 'kds', 'delivery', 'coupons', 'loyalty', 'reports', 'multi_user'] },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');

  // Slug check debounce
  const [debouncedSlug, setDebouncedSlug] = useState('');
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signupRef = useRef<HTMLDivElement>(null);

  // RTK Query hooks
  const { data: plansRaw, isLoading: loadingPlans } = useGetPlansPublicQuery();
  const [registerTenant, { isLoading: submitting }] = useRegisterTenantMutation();

  // Only query slug availability if we have a valid debounced slug
  const { data: slugCheckData, isFetching: slugChecking } = useCheckSlugAvailabilityQuery(
    debouncedSlug,
    { skip: !debouncedSlug || debouncedSlug.length < 3 },
  );

  const slugAvailable = debouncedSlug && debouncedSlug.length >= 3
    ? slugCheckData?.available ?? null
    : null;

  // Normalize plans
  const plans: Plan[] = plansRaw
    ? plansRaw.map((p: any) => ({
        ...p,
        modules: (p.modules || []).map((m: any) => (typeof m === 'string' ? m : m.key)),
      }))
    : loadingPlans
    ? []
    : FALLBACK_PLANS;

  // Set default selected plan
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const midIdx = Math.min(1, plans.length - 1);
      setSelectedPlanId(plans[midIdx].id);
    }
  }, [plans, selectedPlanId]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-generate slug
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  // Debounced slug check
  const triggerSlugCheck = useCallback((slugValue: string) => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (!slugValue || slugValue.length < 3) {
      setDebouncedSlug('');
      return;
    }
    slugCheckTimer.current = setTimeout(() => {
      setDebouncedSlug(slugValue);
    }, 400);
  }, []);

  useEffect(() => {
    triggerSlugCheck(slug);
    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [slug, triggerSlugCheck]);

  const scrollToSignup = (planId?: string) => {
    if (planId) setSelectedPlanId(planId);
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (password.length < 6) {
      setSubmitError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      await registerTenant({
        name,
        slug,
        email,
        password,
        phone: phone.replace(/\D/g, '') || '',
        plan_id: selectedPlanId,
      }).unwrap();
      setSubmitSuccess(true);
      setCreatedSlug(slug);
    } catch (err: any) {
      if (err?.data?.message) {
        setSubmitError(err.data.message);
      } else {
        setSubmitError('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Menu<span className="text-[#FF6B35]">Facil</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#FF6B35] transition-colors">Como Funciona</button>
            <button onClick={() => scrollToSection('funcionalidades')} className="hover:text-[#FF6B35] transition-colors">Funcionalidades</button>
            <button onClick={() => scrollToSection('planos')} className="hover:text-[#FF6B35] transition-colors">Planos</button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-[#FF6B35] transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => scrollToSignup()}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-200"
            >
              Teste Gratis
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left text-sm font-medium text-gray-600 py-2 hover:text-[#FF6B35]">Como Funciona</button>
            <button onClick={() => scrollToSection('funcionalidades')} className="block w-full text-left text-sm font-medium text-gray-600 py-2 hover:text-[#FF6B35]">Funcionalidades</button>
            <button onClick={() => scrollToSection('planos')} className="block w-full text-left text-sm font-medium text-gray-600 py-2 hover:text-[#FF6B35]">Planos</button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="block w-full text-left text-sm font-medium text-gray-600 py-2 hover:text-[#FF6B35]">Entrar</button>
          </div>
        )}
      </header>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-100 rounded-full blur-3xl opacity-30" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100/80 text-[#FF6B35] text-sm font-semibold px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            Plataforma completa para seu restaurante
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6 tracking-tight">
            O sistema de delivery
            <br />
            que <span className="text-[#FF6B35] relative">
              vende sozinho
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none"><path d="M2 8 C60 2, 200 2, 298 8" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" opacity="0.3" /></svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            O sistema completo para delivery, retirada e atendimento presencial.
            <strong className="text-gray-700"> Sem taxa por pedido.</strong> Tudo por um valor fixo mensal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={() => scrollToSignup()}
              className="w-full sm:w-auto bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Teste Gratis por 7 Dias
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToSection('como-funciona')}
              className="w-full sm:w-auto bg-white border-2 border-gray-200 hover:border-[#FF6B35] text-gray-700 hover:text-[#FF6B35] font-semibold px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Como funciona?
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> 7 dias gratis</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Sem cartao de credito</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Sem taxa por pedido</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* ===== BUSINESS TYPES ===== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">
            Ideal para todo tipo de negocio
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {BUSINESS_TYPES.map((biz) => (
              <div
                key={biz.label}
                className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl hover:bg-orange-50 transition-colors cursor-default group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white border border-gray-100 group-hover:border-orange-200 flex items-center justify-center transition-all group-hover:shadow-md">
                  <biz.icon className="w-6 h-6 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
                </div>
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">{biz.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#FF6B35] font-semibold text-sm uppercase tracking-wider">Simples e rapido</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
              Comece a vender em 3 passos
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Configure seu restaurante em minutos e comece a receber pedidos hoje mesmo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-orange-200 to-orange-100" />
                )}
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] rounded-3xl mb-6 shadow-lg shadow-orange-200">
                  <item.icon className="w-8 h-8 text-white" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full border-2 border-[#FF6B35] text-[#FF6B35] text-xs font-bold flex items-center justify-center shadow-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#FF6B35] font-semibold text-sm uppercase tracking-wider">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
              Tudo que voce precisa em um so lugar
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Do cardapio digital ao controle financeiro, todas as ferramentas para gerenciar seu restaurante.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ALL_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center mb-3 group-hover:bg-[#FF6B35] group-hover:text-white transition-colors duration-300">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{feat.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#FF6B35] font-semibold text-sm uppercase tracking-wider">Planos</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
              Escolha o plano ideal para voce
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Todos os planos incluem <strong className="text-gray-700">7 dias gratis</strong> e sem taxa por pedido.
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, idx) => {
                const isPopular = idx === 1;
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                      isPopular
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] text-white shadow-2xl shadow-orange-200 ring-4 ring-orange-100 md:scale-105'
                        : 'bg-white border-2 border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-lg'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3" /> MAIS POPULAR
                      </div>
                    )}

                    <div className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full mb-6 ${
                      isPopular ? 'bg-white/20 text-white' : 'bg-orange-50 text-[#FF6B35]'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      7 dias gratis
                    </div>

                    <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>

                    <div className="flex items-baseline gap-1 mb-8">
                      <span className={`text-sm ${isPopular ? 'text-white/70' : 'text-gray-400'}`}>R$</span>
                      <span className={`text-5xl font-extrabold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm ${isPopular ? 'text-white/70' : 'text-gray-400'}`}>/mes</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.modules.map((mod) => (
                        <li key={mod} className="flex items-center gap-2.5 text-sm">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isPopular ? 'bg-white/20' : 'bg-green-50'
                          }`}>
                            <Check className={`w-3 h-3 ${isPopular ? 'text-white' : 'text-green-600'}`} />
                          </div>
                          <span className={isPopular ? 'text-white/90' : 'text-gray-600'}>
                            {MODULE_LABELS[mod] || mod}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center gap-2.5 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isPopular ? 'bg-white/20' : 'bg-green-50'
                        }`}>
                          <Users className={`w-3 h-3 ${isPopular ? 'text-white' : 'text-green-600'}`} />
                        </div>
                        <span className={isPopular ? 'text-white/90' : 'text-gray-600'}>
                          {plan.max_users >= 999 ? 'Usuarios ilimitados' : `Ate ${plan.max_users} usuarios`}
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => scrollToSignup(plan.id)}
                      className={`w-full py-3.5 rounded-xl font-bold transition-all text-sm ${
                        isPopular
                          ? 'bg-white text-[#FF6B35] hover:bg-gray-50 shadow-lg'
                          : 'bg-[#FF6B35] text-white hover:bg-[#E55A2B] hover:shadow-lg hover:shadow-orange-200'
                      }`}
                    >
                      Comecar agora
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== SIGNUP FORM ===== */}
      <section id="cadastro" ref={signupRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[#FF6B35] font-semibold text-sm uppercase tracking-wider">Cadastro</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
              Crie sua conta gratis
            </h2>
            <p className="text-gray-500 text-lg">
              Configure em minutos. <strong className="text-gray-700">7 dias gratis</strong>, sem compromisso.
            </p>
          </div>

          {submitSuccess ? (
            <div className="text-center p-10 rounded-3xl bg-green-50 border-2 border-green-200">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Conta criada com sucesso!</h3>
              <p className="text-gray-600 mb-8">
                Seu restaurante ja esta pronto. Acesse o painel administrativo para configurar tudo.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-200"
              >
                Acessar painel admin
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="mt-6 text-sm text-gray-500">
                Seu cardapio digital:{' '}
                <a href={`/${createdSlug}`} className="font-semibold text-[#FF6B35] hover:underline">
                  menufacil.com/{createdSlug}
                </a>
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nome do estabelecimento
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pizzaria do Joao"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label htmlFor="slug" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Endereco do seu cardapio
                  </label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
                      menufacil.com/
                    </span>
                    <div className="relative flex-1">
                      <input
                        id="slug"
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => {
                          setSlugManuallyEdited(true);
                          setSlug(slugify(e.target.value));
                        }}
                        className="w-full px-4 py-3 rounded-r-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all"
                        placeholder="pizzaria-do-joao"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        {!slugChecking && slugAvailable === true && <Check className="w-4 h-4 text-green-500" />}
                        {!slugChecking && slugAvailable === false && <X className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                  </div>
                  {!slugChecking && slugAvailable === false && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">Este endereco ja esta em uso.</p>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <p className="mt-1.5 text-xs text-green-600 font-medium">Endereco disponivel!</p>
                  )}
                </div>

                {/* Email + Phone row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 6 caracteres"
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Plan selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Escolha seu plano
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {plans.map((plan) => (
                      <label
                        key={plan.id}
                        className={`relative flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPlanId === plan.id
                            ? 'border-[#FF6B35] bg-orange-50 shadow-md shadow-orange-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={selectedPlanId === plan.id}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="sr-only"
                        />
                        <span className="text-xs sm:text-sm font-bold text-gray-900">{plan.name}</span>
                        <span className="text-sm sm:text-base font-extrabold text-[#FF6B35]">R${plan.price}</span>
                        <span className="text-[10px] text-gray-400">/mes</span>
                        {selectedPlanId === plan.id && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || slugAvailable === false}
                  className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:shadow-orange-200 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando sua conta...
                    </>
                  ) : (
                    <>
                      Criar minha conta gratis
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Ao criar sua conta, voce concorda com nossos Termos de Uso e Politica de Privacidade.
                </p>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Menu<span className="text-[#FF6B35]">Facil</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white transition-colors">Como Funciona</button>
              <button onClick={() => scrollToSection('funcionalidades')} className="hover:text-white transition-colors">Funcionalidades</button>
              <button onClick={() => scrollToSection('planos')} className="hover:text-white transition-colors">Planos</button>
              <button onClick={() => scrollToSignup()} className="hover:text-white transition-colors">Cadastro</button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              MenuFacil &copy; {new Date().getFullYear()}. Todos os direitos reservados.
            </p>
            <p className="text-sm text-gray-500">
              Feito com <span className="text-[#FF6B35]">&hearts;</span> para restaurantes brasileiros
            </p>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING WHATSAPP BUTTON ===== */}
      <a
        href="https://wa.me/5500000000000?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20MenuFacil!"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-all"
        title="Fale conosco pelo WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* ===== SCROLL TO TOP ===== */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-white border border-gray-200 text-gray-600 hover:text-[#FF6B35] hover:border-[#FF6B35] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
