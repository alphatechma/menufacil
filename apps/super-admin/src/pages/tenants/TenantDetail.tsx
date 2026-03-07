import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Power, Building2, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetTenantQuery,
  useGetPlansQuery,
  useToggleTenantActiveMutation,
  useChangeTenantPlanMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showToggleDialog, setShowToggleDialog] = useState(false);

  const { data: tenant, isLoading } = useGetTenantQuery(id!);
  const { data: plans } = useGetPlansQuery();
  const [toggleTenantActive, { isLoading: isToggling }] = useToggleTenantActiveMutation();
  const [changeTenantPlan] = useChangeTenantPlanMutation();

  const plansList = Array.isArray(plans) ? plans : [];

  const handleToggleActive = async () => {
    try {
      await toggleTenantActive(id!).unwrap();
      toast.success(tenant?.is_active ? 'Tenant desativado.' : 'Tenant ativado!');
    } catch {
      toast.error('Erro ao alterar status do tenant.');
    }
    setShowToggleDialog(false);
  };

  const handleChangePlan = async (planId: string) => {
    try {
      await changeTenantPlan({
        id: id!,
        plan_id: planId === 'none' ? '' : planId,
      }).unwrap();
      toast.success('Plano alterado com sucesso!');
    } catch {
      toast.error('Erro ao alterar plano.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-[200px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  {tenant.name}
                </h1>
                <Badge
                  variant={tenant.is_active ? 'default' : 'destructive'}
                  className={tenant.is_active
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15'
                    : ''}
                >
                  {tenant.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">{tenant.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/tenants/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button
            variant={tenant.is_active ? 'destructive' : 'default'}
            onClick={() => setShowToggleDialog(true)}
          >
            <Power className="h-4 w-4" />
            {tenant.is_active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes</CardTitle>
            <CardDescription>Dados do estabelecimento</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <InfoRow icon={Building2} label="Nome" value={tenant.name} />
            <InfoRow icon={Phone} label="Telefone" value={tenant.phone || 'Nao informado'} />
            <InfoRow icon={MapPin} label="Endereco" value={tenant.address || 'Nao informado'} />
            <InfoRow
              icon={Calendar}
              label="Criado em"
              value={new Date(tenant.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Plano</CardTitle>
            <CardDescription>Plano e modulos do tenant</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-5">
            {tenant.plan ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--muted))]">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))]">{tenant.plan.name}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    R$ {Number(tenant.plan.price).toFixed(2)}/mes
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))] p-4 rounded-xl bg-[hsl(var(--muted))]">
                Nenhum plano atribuido
              </p>
            )}

            {tenant.plan?.modules && tenant.plan.modules.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Modulos inclusos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tenant.plan.modules.map((mod: any) => (
                    <Badge key={mod.id} variant="outline">
                      {mod.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Trocar Plano</p>
              <Select
                value={tenant.plan_id || 'none'}
                onValueChange={handleChangePlan}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {plansList.map((plan: any) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {Number(plan.price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toggle Dialog */}
      <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tenant.is_active ? 'Desativar' : 'Ativar'} tenant
            </DialogTitle>
            <DialogDescription>
              {tenant.is_active
                ? `Tem certeza que deseja desativar "${tenant.name}"? Os usuarios nao poderao acessar o sistema.`
                : `Tem certeza que deseja ativar "${tenant.name}"? Os usuarios voltarao a ter acesso.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant={tenant.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={isToggling}
            >
              {isToggling ? 'Processando...' : tenant.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{value}</p>
      </div>
    </div>
  );
}
