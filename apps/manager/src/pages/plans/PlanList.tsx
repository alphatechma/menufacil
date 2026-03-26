import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Users,
  Package,
  Puzzle,
  Check,
  Infinity,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useGetPlansQuery } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatPrice(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const PLAN_ACCENTS = [
  { gradient: 'from-indigo-500 to-violet-600', glow: 'rgba(99, 102, 241, 0.15)', icon: Zap },
  { gradient: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.15)', icon: Sparkles },
  { gradient: 'from-amber-500 to-orange-600', glow: 'rgba(245, 158, 11, 0.15)', icon: Crown },
  { gradient: 'from-rose-500 to-pink-600', glow: 'rgba(244, 63, 94, 0.15)', icon: Zap },
  { gradient: 'from-cyan-500 to-blue-600', glow: 'rgba(6, 182, 212, 0.15)', icon: Sparkles },
];

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export default function PlanList() {
  const { data: plans, isLoading } = useGetPlansQuery();

  const mostUsedPlanId = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    let maxCount = 0;
    let maxId: string | null = null;
    plans.forEach((plan: any) => {
      const count = plan.tenants_count ?? plan.tenants?.length ?? 0;
      if (count > maxCount) {
        maxCount = count;
        maxId = plan.id;
      }
    });
    return maxCount > 0 ? maxId : null;
  }, [plans]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os planos disponíveis para os estabelecimentos.
          </p>
        </div>
        <Button asChild>
          <Link to="/plans/new">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Link>
        </Button>
      </div>

      {/* Plan count */}
      {!isLoading && plans && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {plans.length} {plans.length === 1 ? 'plano' : 'planos'}
          </Badge>
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan: any, index: number) => {
            const accent = PLAN_ACCENTS[index % PLAN_ACCENTS.length];
            const isMostUsed = plan.id === mostUsedPlanId;
            const tenantsCount = plan.tenants_count ?? plan.tenants?.length ?? 0;
            const AccentIcon = accent.icon;

            return (
              <div
                key={plan.id}
                className={cn(
                  'group relative rounded-2xl border bg-card transition-all duration-300',
                  'hover:shadow-lg hover:-translate-y-1',
                  plan.is_active
                    ? 'border-border hover:border-primary/30'
                    : 'border-border/50 opacity-75 hover:opacity-100',
                  isMostUsed && 'ring-1 ring-primary/20',
                )}
                style={{
                  boxShadow: plan.is_active
                    ? `0 0 0 0 transparent`
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (plan.is_active) {
                    e.currentTarget.style.boxShadow = `0 8px 40px ${accent.glow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
                }}
              >
                {/* Gradient top accent */}
                <div
                  className={cn(
                    'h-1 rounded-t-2xl bg-gradient-to-r',
                    plan.is_active ? accent.gradient : 'from-muted to-muted',
                  )}
                />

                {/* Most used ribbon */}
                {isMostUsed && (
                  <div className="absolute -top-0 right-4 z-10">
                    <div className="bg-gradient-to-r from-primary to-violet-500 text-white text-[10px] font-semibold px-3 py-1 rounded-b-lg shadow-lg shadow-primary/20">
                      Mais usado
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* Header with name and status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br',
                          accent.gradient,
                          'shadow-lg',
                        )}
                        style={{ boxShadow: `0 4px 14px ${accent.glow}` }}
                      >
                        <AccentIcon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2.5 py-0.5',
                        plan.is_active
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400',
                      )}
                    >
                      <span
                        className={cn(
                          'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                          plan.is_active
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
                        )}
                      />
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-foreground">
                        {formatPrice(plan.price)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">/mês</p>
                  </div>

                  {/* Limits pills */}
                  <div className="flex flex-wrap gap-2">
                    <LimitPill
                      icon={Users}
                      label="Usuários"
                      value={plan.max_users}
                    />
                    <LimitPill
                      icon={Package}
                      label="Produtos"
                      value={plan.max_products}
                    />
                    {tenantsCount > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                        <Users className="h-3.5 w-3.5" />
                        {tenantsCount} {tenantsCount === 1 ? 'tenant' : 'tenants'}
                      </div>
                    )}
                  </div>

                  {/* Modules checklist */}
                  {plan.modules?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Puzzle className="h-3 w-3 inline-block mr-1 -mt-0.5" />
                        Módulos inclusos
                      </p>
                      <div className="space-y-1.5">
                        {plan.modules.map((mod: any) => (
                          <div
                            key={mod.id}
                            className="flex items-center gap-2 text-sm text-foreground/80"
                          >
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                            </div>
                            {mod.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full group/btn transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
                      asChild
                    >
                      <Link to={`/plans/${plan.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                        Editar Plano
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/10">
              <Sparkles className="h-10 w-10 text-primary/60" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum plano cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Crie o primeiro plano para disponibilizar aos estabelecimentos da plataforma.
          </p>
          <Button asChild>
            <Link to="/plans/new">
              <Plus className="h-4 w-4" />
              Criar Primeiro Plano
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function LimitPill({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/80">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {value != null ? (
        <span>
          {value} {label}
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Infinity className="h-3.5 w-3.5 text-primary" />
          {label}
        </span>
      )}
    </div>
  );
}
