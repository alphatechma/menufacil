import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, AlertCircle, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetTenantQuery,
  useGetPlansQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function TenantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    plan_id: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { data: tenant } = useGetTenantQuery(id!, { skip: !isEditing });
  const { data: plans } = useGetPlansQuery();
  const [createTenant, { isLoading: isCreating }] = useCreateTenantMutation();
  const [updateTenant, { isLoading: isUpdating }] = useUpdateTenantMutation();

  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        slug: tenant.slug || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        plan_id: tenant.plan_id || '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
      });
      setSlugManuallyEdited(true);
    }
  }, [tenant]);

  const handleNameChange = (name: string) => {
    const updates: Record<string, string> = { name };
    if (!isEditing && !slugManuallyEdited) {
      updates.slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEditing) {
      if (!form.admin_name || !form.admin_email || !form.admin_password) {
        setError('Preencha todos os dados do administrador.');
        return;
      }
      if (form.admin_password.length < 6) {
        setError('A senha deve ter no minimo 6 caracteres.');
        return;
      }
      if (!form.plan_id) {
        setError('Selecione um plano.');
        return;
      }
    }

    try {
      if (isEditing) {
        const { admin_name, admin_email, admin_password, ...tenantData } = form;
        await updateTenant({ id: id!, data: tenantData }).unwrap();
        toast.success('Tenant atualizado com sucesso!');
      } else {
        await createTenant(form).unwrap();
        toast.success('Tenant criado com sucesso!');
      }
      navigate('/tenants');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erro ao salvar tenant';
      setError(msg);
      toast.error(msg);
    }
  };

  const plansList = Array.isArray(plans) ? plans : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {isEditing ? 'Editar Tenant' : 'Novo Tenant'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {isEditing ? 'Atualize as informacoes do tenant.' : 'Configure o tenant e o administrador.'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-scale-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Tenant Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Dados do Tenant</CardTitle>
            </div>
            <CardDescription>Informacoes basicas do estabelecimento.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nome do restaurante"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  placeholder="meu-restaurante"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(99) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label>Plano {!isEditing && '*'}</Label>
                <Select
                  value={form.plan_id || 'none'}
                  onValueChange={(value) =>
                    setForm({ ...form, plan_id: value === 'none' ? '' : value })
                  }
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereco</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Rua Exemplo, 123 - Cidade/UF"
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin User (only for creation) */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Administrador</CardTitle>
              </div>
              <CardDescription>Dados do usuario administrador do tenant.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome do Admin *</Label>
                <Input
                  id="admin_name"
                  required
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="admin@restaurante.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password">Senha *</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    required
                    minLength={6}
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    placeholder="Minimo 6 caracteres"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Tenant'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/tenants')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
