import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Power } from 'lucide-react';
import {
  useGetTenantQuery,
  useGetPlansQuery,
  useToggleTenantActiveMutation,
  useChangeTenantPlanMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  const [toggleTenantActive, { isLoading: isToggling }] =
    useToggleTenantActiveMutation();
  const [changeTenantPlan] = useChangeTenantPlanMutation();

  const plansList = Array.isArray(plans) ? plans : [];

  const handleToggleActive = async () => {
    await toggleTenantActive(id!).unwrap();
    setShowToggleDialog(false);
  };

  const handleChangePlan = async (planId: string) => {
    await changeTenantPlan({
      id: id!,
      plan_id: planId === 'none' ? '' : planId,
    }).unwrap();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-[200px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {tenant.name}
            </h1>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
        {/* Tenant Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <InfoRow label="Nome" value={tenant.name} />
            <InfoRow label="Slug" value={tenant.slug} />
            <InfoRow label="Telefone" value={tenant.phone || '-'} />
            <InfoRow label="Endereco" value={tenant.address || '-'} />
            <InfoRow
              label="Status"
              value={
                <Badge
                  variant={tenant.is_active ? 'default' : 'destructive'}
                >
                  {tenant.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              }
            />
            <InfoRow
              label="Criado em"
              value={new Date(tenant.created_at).toLocaleDateString('pt-BR')}
            />
          </CardContent>
        </Card>

        {/* Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Plano</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <InfoRow
              label="Plano Atual"
              value={
                tenant.plan ? (
                  <Badge variant="secondary">
                    {tenant.plan.name} - R${' '}
                    {Number(tenant.plan.price).toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Sem plano</span>
                )
              }
            />

            {tenant.plan?.modules && tenant.plan.modules.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Modulos inclusos:
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
              <p className="text-sm font-medium">Trocar Plano</p>
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

      {/* Toggle Active Confirmation Dialog */}
      <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tenant.is_active ? 'Desativar' : 'Ativar'} tenant
            </DialogTitle>
            <DialogDescription>
              {tenant.is_active
                ? `Tem certeza que deseja desativar o tenant "${tenant.name}"? Os usuarios nao poderao acessar o sistema enquanto estiver inativo.`
                : `Tem certeza que deseja ativar o tenant "${tenant.name}"? Os usuarios voltarao a ter acesso ao sistema.`}
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
              {isToggling
                ? 'Processando...'
                : tenant.is_active
                  ? 'Desativar'
                  : 'Ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
