import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
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
  ChevronRight,
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  modules: string[];
  max_users: number;
  description?: string;
}

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: 'Cardapio Digital',
    description: 'Cardapio online completo com fotos, descricoes e categorias personalizaveis.',
  },
  {
    icon: ClipboardList,
    title: 'Gestao de Pedidos',
    description: 'Acompanhe pedidos em tempo real do recebimento ate a entrega.',
  },
  {
    icon: Monitor,
    title: 'KDS - Kitchen Display',
    description: 'Tela de producao para a cozinha com atualizacao automatica.',
  },
  {
    icon: Truck,
    title: 'Delivery',
    description: 'Sistema completo de entregas com rastreamento e areas de cobertura.',
  },
  {
    icon: Ticket,
    title: 'Cupons',
    description: 'Crie cupons de desconto e promocoes para atrair mais clientes.',
  },
  {
    icon: Heart,
    title: 'Fidelidade',
    description: 'Programa de fidelidade com pontos e recompensas automaticas.',
  },
  {
    icon: BarChart3,
    title: 'Relatorios',
    description: 'Dashboards e relatorios detalhados de vendas e desempenho.',
  },
  {
    icon: Users,
    title: 'Multi-usuario',
    description: 'Gerencie sua equipe com diferentes niveis de acesso e permissoes.',
  },
];

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

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');

  const signupRef = useRef<HTMLDivElement>(null);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch plans
  useEffect(() => {
    api
      .get<Plan[]>('/plans/public')
      .then((res) => {
        setPlans(res.data);
        if (res.data.length > 0) {
          setSelectedPlanId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fallback plans for display
        setPlans([
          {
            id: 'basic',
            name: 'Basico',
            slug: 'basic',
            price: 99,
            max_users: 2,
            modules: ['menu', 'orders', 'customers'],
          },
          {
            id: 'pro',
            name: 'Pro',
            slug: 'pro',
            price: 199,
            max_users: 5,
            modules: ['menu', 'orders', 'customers', 'kds', 'delivery', 'coupons', 'reports'],
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            slug: 'enterprise',
            price: 399,
            max_users: 999,
            modules: ['menu', 'orders', 'customers', 'kds', 'delivery', 'coupons', 'loyalty', 'reports', 'multi_user'],
          },
        ]);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  // Debounced slug availability check
  const checkSlugAvailability = useCallback((slugValue: string) => {
    if (slugCheckTimer.current) {
      clearTimeout(slugCheckTimer.current);
    }
    if (!slugValue || slugValue.length < 3) {
      setSlugAvailable(null);
      setSlugChecking(false);
      return;
    }
    setSlugChecking(true);
    slugCheckTimer.current = setTimeout(() => {
      api
        .get(`/tenants/check-slug/${slugValue}`)
        .then((res) => {
          setSlugAvailable(res.data.available);
        })
        .catch(() => {
          setSlugAvailable(null);
        })
        .finally(() => setSlugChecking(false));
    }, 300);
  }, []);

  useEffect(() => {
    checkSlugAvailability(slug);
    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [slug, checkSlugAvailability]);

  const scrollToSignup = (planId?: string) => {
    if (planId) setSelectedPlanId(planId);
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 6) {
      setSubmitError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register-tenant', {
        name,
        slug,
        email,
        password,
        phone: phone || undefined,
        plan_id: selectedPlanId,
      });
      setSubmitSuccess(true);
      setCreatedSlug(slug);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else {
        setSubmitError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const MODULE_LABELS: Record<string, string> = {
    menu: 'Cardapio Digital',
    orders: 'Gestao de Pedidos',
    customers: 'Clientes',
    kds: 'KDS',
    delivery: 'Delivery',
    coupons: 'Cupons',
    loyalty: 'Fidelidade',
    reports: 'Relatorios',
    multi_user: 'Multi-usuario',
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-[#FF6B35]" />
            <span className="text-xl font-bold text-gray-900">
              Menu<span className="text-[#FF6B35]">Facil</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-[#FF6B35] transition-colors">
              Funcionalidades
            </a>
            <a href="#pricing" className="hover:text-[#FF6B35] transition-colors">
              Planos
            </a>
            <a href="#signup" className="hover:text-[#FF6B35] transition-colors">
              Cadastro
            </a>
          </nav>
          <button
            onClick={() => scrollToSignup()}
            className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Comece gratis
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-[#FF6B35] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Plataforma completa para restaurantes
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Seu restaurante no
            <br />
            <span className="text-[#FF6B35]">mundo digital</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Cardapio digital, gestao de pedidos, delivery e muito mais.
            Tudo que voce precisa para modernizar seu restaurante em uma unica plataforma.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => scrollToSignup()}
              className="w-full sm:w-auto bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:shadow-orange-200 flex items-center justify-center gap-2"
            >
              Comece gratis
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto border-2 border-gray-200 hover:border-[#FF6B35] text-gray-700 hover:text-[#FF6B35] font-semibold px-8 py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2"
            >
              Ver demo
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              7 dias gratis
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              Sem cartao de credito
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              Cancele quando quiser
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que seu restaurante precisa
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Funcionalidades completas para gerenciar seu negocio do pedido a entrega.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#FF6B35]/20 hover:shadow-lg hover:shadow-orange-50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center mb-4 group-hover:bg-[#FF6B35] group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Planos para todos os tamanhos
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negocio. Todos incluem 7 dias gratis.
            </p>
          </div>
          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, idx) => {
                const isPopular = idx === 1;
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                      isPopular
                        ? 'bg-[#FF6B35] text-white shadow-xl shadow-orange-200 scale-105'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}
                  >
                    {/* Trial badge */}
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full mb-4 ${
                        isPopular ? 'bg-white/20 text-white' : 'bg-orange-50 text-[#FF6B35]'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      7 dias gratis
                    </div>

                    <h3
                      className={`text-xl font-bold mb-1 ${isPopular ? 'text-white' : 'text-gray-900'}`}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span
                        className={`text-4xl font-extrabold ${isPopular ? 'text-white' : 'text-gray-900'}`}
                      >
                        R${plan.price}
                      </span>
                      <span className={`text-sm ${isPopular ? 'text-white/70' : 'text-gray-400'}`}>
                        /mes
                      </span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.modules.map((mod) => (
                        <li key={mod} className="flex items-center gap-2 text-sm">
                          <Check
                            className={`w-4 h-4 flex-shrink-0 ${
                              isPopular ? 'text-white' : 'text-green-500'
                            }`}
                          />
                          <span className={isPopular ? 'text-white/90' : 'text-gray-600'}>
                            {MODULE_LABELS[mod] || mod}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center gap-2 text-sm">
                        <Users
                          className={`w-4 h-4 flex-shrink-0 ${
                            isPopular ? 'text-white' : 'text-green-500'
                          }`}
                        />
                        <span className={isPopular ? 'text-white/90' : 'text-gray-600'}>
                          {plan.max_users >= 999 ? 'Usuarios ilimitados' : `Ate ${plan.max_users} usuarios`}
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => scrollToSignup(plan.id)}
                      className={`w-full py-3 rounded-xl font-semibold transition-all text-sm ${
                        isPopular
                          ? 'bg-white text-[#FF6B35] hover:bg-gray-50'
                          : 'bg-[#FF6B35] text-white hover:bg-[#E55A2B]'
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

      {/* Signup Form Section */}
      <section id="signup" ref={signupRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Crie sua conta gratis
            </h2>
            <p className="text-gray-600 text-lg">
              Configure seu restaurante em minutos. 7 dias gratis, sem compromisso.
            </p>
          </div>

          {submitSuccess ? (
            <div className="text-center p-8 rounded-2xl bg-green-50 border border-green-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Conta criada com sucesso!</h3>
              <p className="text-gray-600 mb-6">
                Seu restaurante ja esta pronto. Acesse o painel administrativo para configurar tudo.
              </p>
              <a
                href={`/admin`}
                className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Acessar painel admin
                <ArrowRight className="w-5 h-5" />
              </a>
              <p className="mt-4 text-sm text-gray-500">
                Seu cardapio estara disponivel em:{' '}
                <span className="font-medium text-gray-700">menufacil.com/{createdSlug}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Establishment Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do estabelecimento
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pizzaria do Joao"
                  className="input-field"
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Endereco do seu cardapio
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
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
                      className="w-full px-4 py-3 rounded-r-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-200"
                      placeholder="pizzaria-do-joao"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugChecking && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                      {!slugChecking && slugAvailable === true && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {!slugChecking && slugAvailable === false && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
                {!slugChecking && slugAvailable === false && (
                  <p className="mt-1 text-sm text-red-500">Este endereco ja esta em uso.</p>
                )}
                {!slugChecking && slugAvailable === true && (
                  <p className="mt-1 text-sm text-green-600">Endereco disponivel!</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-field"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="input-field"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-field"
                />
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Escolha seu plano
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-[#FF6B35] bg-orange-50'
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
                      <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                      <span className="text-lg font-bold text-[#FF6B35]">R${plan.price}/mes</span>
                      {selectedPlanId === plan.id && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || slugAvailable === false}
                className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2"
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
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#FF6B35]" />
            <span className="text-white font-semibold">
              Menu<span className="text-[#FF6B35]">Facil</span>
            </span>
          </div>
          <p className="text-sm">MenuFacil &copy; 2026. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
