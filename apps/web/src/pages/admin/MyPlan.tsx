import {
  Crown,
  Check,
  X as XIcon,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  MapPin,
  Ticket,
  Heart,
  Monitor,
  BarChart3,
  ArrowRight,
  MessageCircle,
  Star,
} from 'lucide-react';
import { useGetPublicPlansQuery } from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';
import { SettingsPageSkeleton } from '@/components/ui/Skeleton';

interface PlanModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  max_users: number | null;
  max_products: number | null;
  is_active: boolean;
  modules: PlanModule[];
}

const MODULE_ICONS: Record<string, typeof ShoppingCart> = {
  orders: ShoppingCart,
  products: Package,
  categories: FolderTree,
  customers: Users,
  delivery: MapPin,
  coupons: Ticket,
  loyalty: Heart,
  kds: Monitor,
  reports: BarChart3,
};

const MODULE_LABELS: Record<string, string> = {
  orders: 'Pedidos',
  products: 'Produtos',
  categories: 'Categorias',
  customers: 'Clientes',
  delivery: 'Zonas de Entrega',
  coupons: 'Cupons',
  loyalty: 'Fidelidade',
  kds: 'KDS',
  reports: 'Relatorios',
};

const ALL_MODULE_KEYS = [
  'orders', 'products', 'categories', 'customers',
  'delivery', 'coupons', 'loyalty', 'kds', 'reports',
];

export default function MyPlan() {
  const currentPlan = useAppSelector((state) => state.adminAuth.plan);
  const currentModules = useAppSelector((state) => state.adminAuth.modules);
  const { data: plans = [], isLoading } = useGetPublicPlansQuery();

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId;

  const getPlanColor = (index: number, isCurrent: boolean) => {
    if (isCurrent) return 'border-primary ring-2 ring-primary/20';
    const colors = [
      'border-border hover:border-gray-300',
      'border-border hover:border-indigo-300 dark:hover:border-indigo-700',
      'border-border hover:border-amber-300 dark:hover:border-amber-700',
    ];
    return colors[index] || colors[0];
  };

  const getPlanBadgeColor = (index: number) => {
    const colors = [
      'bg-muted text-foreground',
      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    ];
    return colors[index] || colors[0];
  };

  if (isLoading) return <SettingsPageSkeleton />;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Plano</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e veja as funcionalidades disponiveis
        </p>
      </div>

      {/* Current Plan Summary */}
      {currentPlan && (
        <div className="bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary/10 dark:to-orange-900/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <h2 className="text-xl font-bold text-foreground">{currentPlan.name}</h2>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-bold text-foreground">
                {formatPrice(currentPlan.price)}
                <span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentModules.length} modulo{currentModules.length !== 1 ? 's' : ''} ativo{currentModules.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Current modules chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {currentModules.map((key) => {
              const Icon = MODULE_ICONS[key] || Package;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card/80 border border-primary/10 rounded-lg text-sm font-medium text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {MODULE_LABELS[key] || key}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Plans Comparison */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-foreground">
            {plans.length > 1 ? 'Compare os planos' : 'Plano disponivel'}
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(plans as Plan[]).map((plan, index) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isUpgrade = currentPlan && plan.price > currentPlan.price;
            const planModuleKeys = plan.modules.map((m) => m.key);

            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl border-2 p-6 transition-all ${getPlanColor(index, isCurrent)}`}
              >
                {/* Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                      <Crown className="w-3 h-3" />
                      Plano atual
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="text-center mb-6">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${getPlanBadgeColor(index)}`}>
                    {plan.name}
                  </span>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  {plan.max_users ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Ate {plan.max_users} usuario{plan.max_users > 1 ? 's' : ''}
                      {plan.max_products ? ` · ${plan.max_products} produtos` : ' · Produtos ilimitados'}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Usuarios ilimitados · Produtos ilimitados
                    </p>
                  )}
                </div>

                {/* Module list */}
                <div className="space-y-2.5 mb-6">
                  {ALL_MODULE_KEYS.map((key) => {
                    const included = planModuleKeys.includes(key);
                    const Icon = MODULE_ICONS[key] || Package;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2.5 text-sm ${
                          included ? 'text-foreground' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {included ? (
                          <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <XIcon className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <Icon className={`w-4 h-4 shrink-0 ${included ? 'text-muted-foreground' : 'text-gray-300 dark:text-gray-600'}`} />
                        <span className={included ? '' : 'line-through'}>
                          {MODULE_LABELS[key] || key}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    Plano atual
                  </button>
                ) : isUpgrade ? (
                  <a
                    href={`https://wa.me/5500000000000?text=${encodeURIComponent(
                      `Ola! Gostaria de fazer upgrade para o plano ${plan.name} no MenuFacil.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Fazer upgrade
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    Plano inferior
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">Precisa de ajuda para escolher?</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              Entre em contato com nosso time e encontraremos o plano ideal para o seu negocio.
            </p>
          </div>
          <a
            href={`https://wa.me/5500000000000?text=${encodeURIComponent(
              'Ola! Gostaria de saber mais sobre os planos do MenuFacil.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
