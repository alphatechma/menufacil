import { Link } from 'react-router-dom';
import { Plus, Pencil, Users, Package, Puzzle } from 'lucide-react';
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

function PlanCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-5 w-16 rounded-md" />
      </CardFooter>
    </Card>
  );
}

function formatPrice(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function PlanList() {
  const { data: plans, isLoading } = useGetPlansQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground text-sm">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map((plan: any) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/plans/${plan.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mês
                  </span>
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Usuários
                    </span>
                    <span className="font-medium text-foreground">
                      {plan.max_users ?? 'Ilimitado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Produtos
                    </span>
                    <span className="font-medium text-foreground">
                      {plan.max_products ?? 'Ilimitado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Puzzle className="h-4 w-4" />
                      Módulos
                    </span>
                    <span className="font-medium text-foreground">
                      {plan.modules?.length ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
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
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
