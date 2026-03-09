import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Power, Building2, Phone, MapPin, Calendar, CreditCard,
  KeyRound, Trash2, LogIn, Users, Wifi, WifiOff, Ban, Loader2, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetTenantQuery,
  useGetPlansQuery,
  useToggleTenantActiveMutation,
  useChangeTenantPlanMutation,
  useResetTenantPasswordMutation,
  useRevokeAllSessionsMutation,
  useRevokeUserSessionMutation,
  useGetTenantUsersQuery,
  useImpersonateTenantMutation,
  useDeleteTenantMutation,
  useGetTenantWhatsappStatusQuery,
  useReconnectTenantWhatsappMutation,
  useDisconnectTenantWhatsappMutation,
} from '@/api/superAdminApi';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const user = useAppSelector((s) => s.auth.user);

  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');

  const { data: tenant, isLoading } = useGetTenantQuery(id!);
  const { data: plans } = useGetPlansQuery();
  const { data: tenantUsers } = useGetTenantUsersQuery(id!);
  const { data: whatsappStatus } = useGetTenantWhatsappStatusQuery(id!);

  const [toggleTenantActive, { isLoading: isToggling }] = useToggleTenantActiveMutation();
  const [changeTenantPlan] = useChangeTenantPlanMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetTenantPasswordMutation();
  const [revokeAllSessions, { isLoading: isRevokingAll }] = useRevokeAllSessionsMutation();
  const [revokeUserSession] = useRevokeUserSessionMutation();
  const [impersonateTenant, { isLoading: isImpersonating }] = useImpersonateTenantMutation();
  const [deleteTenant, { isLoading: isDeleting }] = useDeleteTenantMutation();
  const [reconnectWhatsapp, { isLoading: isReconnecting }] = useReconnectTenantWhatsappMutation();
  const [disconnectWhatsapp, { isLoading: isDisconnecting }] = useDisconnectTenantWhatsappMutation();

  const plansList = Array.isArray(plans) ? plans : [];
  const users = Array.isArray(tenantUsers) ? tenantUsers : [];

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
      await changeTenantPlan({ id: id!, plan_id: planId === 'none' ? '' : planId }).unwrap();
      toast.success('Plano alterado com sucesso!');
    } catch {
      toast.error('Erro ao alterar plano.');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no minimo 6 caracteres.');
      return;
    }
    try {
      await resetPassword({ id: id!, new_password: newPassword }).unwrap();
      toast.success('Senha resetada com sucesso!');
      setShowResetPasswordDialog(false);
      setNewPassword('');
    } catch {
      toast.error('Erro ao resetar senha.');
    }
  };

  const handleRevokeAll = async () => {
    try {
      const result = await revokeAllSessions(id!).unwrap();
      toast.success(`${result.count} sessoes revogadas.`);
    } catch {
      toast.error('Erro ao revogar sessoes.');
    }
    setShowRevokeAllDialog(false);
  };

  const handleRevokeUser = async (userId: string) => {
    try {
      await revokeUserSession({ tenantId: id!, userId }).unwrap();
      toast.success('Sessao do usuario revogada.');
    } catch {
      toast.error('Erro ao revogar sessao.');
    }
  };

  const handleImpersonate = async () => {
    try {
      const result = await impersonateTenant({ id: id!, super_admin_id: user?.id || '' }).unwrap();
      // Encode impersonation data as base64 to pass via URL
      const impersonateData = btoa(JSON.stringify({
        access_token: result.access_token,
        tenant_slug: result.tenant_slug,
        user: result.user,
        modules: result.modules,
        permissions: result.permissions,
        plan: result.plan,
      }));
      const url = `https://menufacil.maistechtecnologia.com.br/admin?impersonate=${impersonateData}`;
      window.open(url, '_blank');
      toast.success('Abrindo painel do tenant...');
    } catch {
      toast.error('Erro ao impersonar tenant.');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmSlug !== tenant?.slug) {
      toast.error('Slug nao confere. Digite o slug corretamente.');
      return;
    }
    try {
      await deleteTenant(id!).unwrap();
      toast.success('Tenant excluido com sucesso.');
      navigate('/tenants');
    } catch {
      toast.error('Erro ao excluir tenant.');
    }
  };

  const handleReconnectWhatsapp = async () => {
    try {
      await reconnectWhatsapp(id!).unwrap();
      toast.success('WhatsApp reconectado!');
    } catch {
      toast.error('Erro ao reconectar WhatsApp.');
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await disconnectWhatsapp(id!).unwrap();
      toast.success('WhatsApp desconectado.');
    } catch {
      toast.error('Erro ao desconectar WhatsApp.');
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
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (!tenant) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    cashier: 'Caixa',
    kitchen: 'Cozinha',
    waiter: 'Garcom',
  };

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleImpersonate} disabled={isImpersonating}>
            {isImpersonating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Impersonar
          </Button>
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

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informacoes</TabsTrigger>
          <TabsTrigger value="users">Usuarios ({users.length})</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        {/* --- Info Tab --- */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Info Card */}
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

            {/* Plan Card */}
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
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Modulos inclusos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.plan.modules.map((mod: any) => (
                        <Badge key={mod.id} variant="outline">{mod.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">Trocar Plano</p>
                  <Select value={tenant.plan_id || 'none'} onValueChange={handleChangePlan}>
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

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Acoes</CardTitle>
              <CardDescription>Gerenciamento do tenant</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setShowResetPasswordDialog(true)}>
                  <KeyRound className="h-4 w-4" />
                  Resetar Senha do Admin
                </Button>
                <Button variant="outline" onClick={() => setShowRevokeAllDialog(true)}>
                  <Ban className="h-4 w-4" />
                  Derrubar Todas as Sessoes
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir Tenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Users Tab --- */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios do Tenant</CardTitle>
                  <CardDescription>{users.length} usuario(s) cadastrado(s)</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowRevokeAllDialog(true)}>
                  <Ban className="h-4 w-4" />
                  Derrubar Todas as Sessoes
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {users.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum usuario encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((u: any) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--muted))]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))]">{u.name}</p>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {roleLabels[u.system_role] || u.system_role}
                        </Badge>
                        {u.role?.name && (
                          <Badge variant="secondary">{u.role.name}</Badge>
                        )}
                        <Badge
                          variant={u.is_active ? 'default' : 'destructive'}
                          className={u.is_active
                            ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15'
                            : ''}
                        >
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeUser(u.id)}
                          title="Derrubar sessao deste usuario"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- WhatsApp Tab --- */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Status da conexao do WhatsApp do tenant</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--muted))]">
                {whatsappStatus?.status === 'connected' ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))]">
                    {whatsappStatus?.status === 'connected' ? 'Conectado' :
                     whatsappStatus?.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  </p>
                  {whatsappStatus?.phone_number && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Numero: {whatsappStatus.phone_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {whatsappStatus?.status === 'connected' ? (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnectWhatsapp}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    onClick={handleReconnectWhatsapp}
                    disabled={isReconnecting}
                  >
                    {isReconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reconectar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}

      {/* Toggle Active */}
      <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tenant.is_active ? 'Desativar' : 'Ativar'} tenant</DialogTitle>
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

      {/* Reset Password */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha do Admin</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o administrador de "{tenant.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              minLength={6}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6}>
              {isResetting ? 'Resetando...' : 'Resetar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Derrubar Todas as Sessoes</DialogTitle>
            <DialogDescription>
              Todos os usuarios de "{tenant.name}" serao deslogados imediatamente. Eles precisarao fazer login novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRevokeAll} disabled={isRevokingAll}>
              {isRevokingAll ? 'Revogando...' : 'Derrubar Sessoes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Tenant</DialogTitle>
            <DialogDescription>
              Esta acao ira desativar o tenant. Para confirmar, digite o slug "{tenant.slug}" abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirmSlug">Confirmar Slug</Label>
            <Input
              id="confirmSlug"
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              placeholder={tenant.slug}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmSlug !== tenant.slug}
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusao'}
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
