import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  User,
  Building2,
  CreditCard,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Users,
  Package,
  Puzzle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetTenantQuery,
  useGetPlansQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useLazyCheckSlugQuery,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Estabelecimento', icon: Building2 },
  { id: 2, label: 'Plano', icon: CreditCard },
  { id: 3, label: 'Administrador', icon: User },
  { id: 4, label: 'Revisão', icon: ClipboardCheck },
];

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: 'Razoável', color: 'bg-amber-500' };
  if (score <= 3) return { level: 3, label: 'Boa', color: 'bg-blue-500' };
  return { level: 4, label: 'Forte', color: 'bg-emerald-500' };
}

export default function TenantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    plan_id: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: tenant } = useGetTenantQuery(id!, { skip: !isEditing });
  const { data: plans } = useGetPlansQuery();
  const [createTenant, { isLoading: isCreating }] = useCreateTenantMutation();
  const [updateTenant, { isLoading: isUpdating }] = useUpdateTenantMutation();
  const [checkSlug] = useLazyCheckSlugQuery();

  const isSaving = isCreating || isUpdating;
  const plansList = Array.isArray(plans) ? plans : [];
  const selectedPlan = plansList.find((p: any) => p.id === form.plan_id);
  const passwordStrength = getPasswordStrength(form.admin_password);

  const debouncedCheckSlug = useCallback((slug: string) => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }
    // Skip check if editing and slug hasn't changed from original
    if (isEditing && tenant && slug === tenant.slug) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const result = await checkSlug(slug).unwrap();
        setSlugStatus(result.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  }, [checkSlug, isEditing, tenant]);

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
        admin_password_confirm: '',
      });
      setSlugManuallyEdited(true);
    }
  }, [tenant]);

  const handleNameChange = (name: string) => {
    const updates: Record<string, string> = { name };
    if (!isEditing && !slugManuallyEdited) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      updates.slug = slug;
      debouncedCheckSlug(slug);
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!form.name.trim()) return 'O nome do estabelecimento é obrigatório.';
        if (!form.slug.trim()) return 'O slug é obrigatório.';
        if (slugStatus === 'taken') return 'Este slug já está em uso. Escolha outro.';
        return null;
      case 2:
        if (!form.plan_id) return 'Selecione um plano.';
        return null;
      case 3:
        if (!form.admin_name.trim()) return 'O nome do administrador é obrigatório.';
        if (!form.admin_email.trim()) return 'O email do administrador é obrigatório.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email)) return 'Email inválido.';
        if (!form.admin_password) return 'A senha é obrigatória.';
        if (form.admin_password.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
        if (form.admin_password !== form.admin_password_confirm) return 'As senhas não coincidem.';
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const handlePrev = () => {
    setError('');
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!isEditing) {
      for (let step = 1; step <= 3; step++) {
        const validationError = validateStep(step);
        if (validationError) {
          setError(validationError);
          setCurrentStep(step);
          return;
        }
      }
    }

    try {
      if (isEditing) {
        const { admin_name, admin_email, admin_password, admin_password_confirm, plan_id, ...tenantData } = form;
        const cleanData: Record<string, any> = { ...tenantData };
        if (plan_id) cleanData.plan_id = plan_id;
        await updateTenant({ id: id!, data: cleanData }).unwrap();
        notify.success('Estabelecimento atualizado com sucesso!');
      } else {
        const { admin_password_confirm, plan_id, ...submitData } = form;
        const cleanData: Record<string, any> = { ...submitData };
        if (plan_id) cleanData.plan_id = plan_id;
        await createTenant(cleanData).unwrap();
        notify.success('Estabelecimento criado com sucesso!');
      }
      navigate('/tenants');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erro ao salvar estabelecimento';
      setError(typeof msg === 'string' ? msg : 'Dados inválidos');
      notify.error(typeof msg === 'string' ? msg : 'Dados inválidos');

      // Parse field-level errors from API response
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        const errors: Record<string, string> = {};
        for (const e of err.data.errors) {
          if (e.field && e.message) {
            errors[e.field] = e.message;
          }
        }
        setFieldErrors(errors);
      } else if (err?.data?.message && Array.isArray(err.data.message)) {
        const errors: Record<string, string> = {};
        for (const m of err.data.message) {
          if (typeof m === 'string') {
            const lower = m.toLowerCase();
            if (lower.includes('nome') || lower.includes('name')) errors.name = m;
            else if (lower.includes('slug')) errors.slug = m;
            else if (lower.includes('email') || lower.includes('e-mail')) errors.admin_email = m;
            else if (lower.includes('senha') || lower.includes('password')) errors.admin_password = m;
            else if (lower.includes('telefone') || lower.includes('phone')) errors.phone = m;
          }
        }
        setFieldErrors(errors);
      }
    }
  };

  // For editing mode, use original simple form
  if (isEditing) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Editar Estabelecimento
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Atualize as informações do estabelecimento.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-scale-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Dados do Estabelecimento</CardTitle>
              </div>
              <CardDescription>Informações básicas do estabelecimento.</CardDescription>
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
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      required
                      value={form.slug}
                      onChange={(e) => {
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '');
                        setSlugManuallyEdited(true);
                        setForm({ ...form, slug: value });
                        debouncedCheckSlug(value);
                      }}
                      placeholder="meu-restaurante"
                      className={cn(
                        'font-mono text-sm pr-10',
                        slugStatus === 'taken' && 'border-destructive focus-visible:ring-destructive',
                        slugStatus === 'available' && 'border-emerald-500 focus-visible:ring-emerald-500',
                      )}
                    />
                    {slugStatus === 'checking' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                    {slugStatus === 'available' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    {slugStatus === 'taken' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  {slugStatus === 'taken' && (
                    <p className="text-xs text-destructive">Este slug já está em uso.</p>
                  )}
                  {fieldErrors.slug && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.slug}</p>
                  )}
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
                  {fieldErrors.phone && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
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
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua Exemplo, 123 - Cidade/UF"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/tenants')}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Creation wizard
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Novo Estabelecimento
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Configure o estabelecimento e o administrador passo a passo.
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-0 max-w-2xl mx-auto">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted) {
                      setError('');
                      setCurrentStep(step.id);
                    }
                  }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2',
                    isActive
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                      : isCompleted
                        ? 'bg-primary/10 text-primary border-primary cursor-pointer hover:bg-primary/20'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-transparent',
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </button>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-medium whitespace-nowrap',
                    isActive
                      ? 'text-primary'
                      : isCompleted
                        ? 'text-primary/70'
                        : 'text-[hsl(var(--muted-foreground))]',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 sm:w-24 h-0.5 mx-2 mt-[-18px] transition-colors duration-200',
                    currentStep > step.id ? 'bg-primary' : 'bg-[hsl(var(--border))]',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-scale-in max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        {/* Step 1 - Estabelecimento */}
        {currentStep === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Info do Estabelecimento</CardTitle>
              </div>
              <CardDescription>Informações básicas do restaurante ou estabelecimento.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Nome do restaurante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => {
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '');
                        setSlugManuallyEdited(true);
                        setForm({ ...form, slug: value });
                        debouncedCheckSlug(value);
                      }}
                      placeholder="meu-restaurante"
                      className={cn(
                        'font-mono text-sm pr-10',
                        slugStatus === 'taken' && 'border-destructive focus-visible:ring-destructive',
                        slugStatus === 'available' && 'border-emerald-500 focus-visible:ring-emerald-500',
                      )}
                    />
                    {slugStatus === 'checking' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                    {slugStatus === 'available' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    {slugStatus === 'taken' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  {slugStatus === 'taken' && (
                    <p className="text-xs text-destructive">
                      Este slug já está em uso. Escolha outro.
                    </p>
                  )}
                  {slugStatus === 'available' && (
                    <p className="text-xs text-emerald-600">Slug disponível!</p>
                  )}
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    URL: menufacil.com/<strong>{form.slug || 'slug'}</strong>
                  </p>
                </div>
              </div>
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
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua Exemplo, 123 - Cidade/UF"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 - Plano */}
        {currentStep === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Selecione o Plano</CardTitle>
              </div>
              <CardDescription>Escolha o plano mais adequado para o estabelecimento.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {plansList.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum plano cadastrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plansList.map((plan: any, index: number) => {
                    const isSelected = form.plan_id === plan.id;
                    const isRecommended = index === 1;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm({ ...form, plan_id: plan.id })}
                        className={cn(
                          'relative text-left p-5 rounded-xl border-2 transition-all duration-200',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-[hsl(var(--border))] hover:border-primary/40 hover:shadow-sm',
                        )}
                      >
                        {isRecommended && (
                          <Badge className="absolute -top-2.5 right-3 bg-primary text-white text-[10px]">
                            Recomendado
                          </Badge>
                        )}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{plan.name}</h3>
                        <div className="mt-2 mb-4">
                          <span className="text-2xl font-bold text-primary">
                            R$ {Number(plan.price).toFixed(2)}
                          </span>
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">/mes</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                            <Users className="w-4 h-4 shrink-0" />
                            <span>{plan.max_users || 'Ilimitados'} usuários</span>
                          </div>
                          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                            <Package className="w-4 h-4 shrink-0" />
                            <span>{plan.max_products || 'Ilimitados'} produtos</span>
                          </div>
                          {plan.modules && plan.modules.length > 0 && (
                            <div className="flex items-start gap-2 text-[hsl(var(--muted-foreground))]">
                              <Puzzle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{plan.modules.length} modulo{plan.modules.length !== 1 ? 's' : ''} incluido{plan.modules.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3 - Admin */}
        {currentStep === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Administrador</CardTitle>
              </div>
              <CardDescription>Dados do usuario administrador do estabelecimento.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome do Admin *</Label>
                <Input
                  id="admin_name"
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Email *</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  placeholder="admin@restaurante.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="admin_password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.admin_password}
                      onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.admin_password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              'h-1.5 flex-1 rounded-full transition-colors',
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : 'bg-[hsl(var(--muted))]',
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Forca: <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_password_confirm">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="admin_password_confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.admin_password_confirm}
                      onChange={(e) => setForm({ ...form, admin_password_confirm: e.target.value })}
                      placeholder="Repita a senha"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.admin_password_confirm && form.admin_password !== form.admin_password_confirm && (
                    <p className="text-xs text-destructive">As senhas não coincidem.</p>
                  )}
                  {form.admin_password_confirm && form.admin_password === form.admin_password_confirm && form.admin_password_confirm.length > 0 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Senhas coincidem
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4 - Revisão */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            {/* Estabelecimento */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Estabelecimento</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setError(''); setCurrentStep(1); }}
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Nome</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{form.name}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Slug</p>
                    <p className="font-medium text-[hsl(var(--foreground))] font-mono">{form.slug}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Telefone</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{form.phone || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Endereço</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{form.address || '\u2014'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plano */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Plano</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setError(''); setCurrentStep(2); }}
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedPlan ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">{selectedPlan.name}</Badge>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      R$ {Number(selectedPlan.price).toFixed(2)}/mes
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Nenhum plano selecionado</span>
                )}
              </CardContent>
            </Card>

            {/* Admin */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Administrador</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setError(''); setCurrentStep(3); }}
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Nome</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{form.admin_name}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Email</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{form.admin_email}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs">Senha</p>
                    <p className="font-medium text-[hsl(var(--foreground))]">{'*'.repeat(form.admin_password.length)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/tenants')}>
              Cancelar
            </Button>
            {currentStep < 4 ? (
              <Button type="button" onClick={handleNext}>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Criando...' : 'Criar Estabelecimento'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
