import { Link } from 'react-router-dom';
import { Plus, Pencil, Users, Package, Puzzle, Check, Infinity } from 'lucide-react';
import { useGetPlansQuery } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

function formatPrice(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function PlanCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-9 w-full mt-6" />
      </CardContent>
    </Card>
  );
}

export default function PlanList() {
  const { data: plans, isLoading } = useGetPlansQuery();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Planos</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Gerencie os planos disponiveis para os estabelecimentos.
          </p>
        </div>
        <Button asChild>
          <Link to="/plans/new">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map((plan: any) => (
            <Card
              key={plan.id}
              className="group flex flex-col hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              {/* Top accent */}
              <div className={`h-1 ${plan.is_active ? 'bg-primary' : 'bg-[hsl(var(--muted))]'}`} />

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Badge
                    variant={plan.is_active ? 'default' : 'secondary'}
                    className={
                      plan.is_active
                        ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15'
                        : 'bg-red-500/15 text-red-700 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-500/15'
                    }
                  >
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-5">
                <div>
                  <p className="text-3xl font-bold text-primary tracking-tight">
                    {formatPrice(plan.price)}
                  </p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">/mes</p>
                </div>

                <div className="space-y-3">
                  <LimitRow
                    icon={Users}
                    label="Usuários"
                    value={plan.max_users}
                  />
                  <LimitRow
                    icon={Package}
                    label="Produtos"
                    value={plan.max_products}
                  />
                  <LimitRow
                    icon={Puzzle}
                    label="Módulos"
                    value={plan.modules?.length ?? 0}
                    showInfinity={false}
                  />
                </div>

                {plan.modules?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {plan.modules.slice(0, 4).map((mod: any) => (
                      <Badge key={mod.id} variant="outline" className="text-xs">
                        {mod.name}
                      </Badge>
                    ))}
                    {plan.modules.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{plan.modules.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/plans/${plan.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Editar Plano
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LimitRow({
  icon: Icon,
  label,
  value,
  showInfinity = true,
}: {
  icon: any;
  label: string;
  value: number | null | undefined;
  showInfinity?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-medium text-[hsl(var(--foreground))] flex items-center gap-1">
        {value != null ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            {value}
          </>
        ) : showInfinity ? (
          <>
            <Infinity className="h-4 w-4 text-primary" />
            Ilimitado
          </>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
