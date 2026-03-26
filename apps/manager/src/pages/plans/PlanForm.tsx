import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  DollarSign,
  Users,
  Package,
  Puzzle,
  Check,
  Minus,
  Plus,
  ToggleLeft,
} from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetPlanQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useUpdatePlanModulesMutation,
  useGetSystemModulesQuery,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MODULE_ICONS: Record<string, any> = {
  product: Package,
  order: Package,
  customer: Users,
  delivery: Package,
  coupon: Package,
  loyalty: Package,
  kds: Package,
  report: Package,
};

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!id;

  const { data: plan } = useGetPlanQuery(id!, { skip: !isEditing });
  const { data: modules } = useGetSystemModulesQuery();

  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
  const [updatePlanModules] = useUpdatePlanModulesMutation();

  const isSaving = isCreating || isUpdating;

  const [form, setForm] = useState({
    name: '',
    price: '',
    max_users: '',
    max_products: '',
    is_active: true,
  });
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        price: String(plan.price) || '',
        max_users: plan.max_users != null ? String(plan.max_users) : '',
        max_products: plan.max_products != null ? String(plan.max_products) : '',
        is_active: plan.is_active,
      });
      setSelectedModules(plan.modules?.map((m: any) => m.id) || []);
    }
  }, [plan]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const toggleAll = () => {
    if (!modules) return;
    if (selectedModules.length === modules.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(modules.map((m: any) => m.id));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      max_users: form.max_users ? parseInt(form.max_users) : null,
      max_products: form.max_products ? parseInt(form.max_products) : null,
      is_active: form.is_active,
    };

    try {
      let planId = id;

      if (isEditing) {
        await updatePlan({ id: id!, data: payload }).unwrap();
      } else {
        const created = await createPlan(payload).unwrap();
        planId = created.id;
      }

      await updatePlanModules({
        id: planId!,
        module_ids: selectedModules,
      }).unwrap();

      notify.success(isEditing ? 'Plano atualizado!' : 'Plano criado com sucesso!');
      navigate('/plans');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erro ao salvar plano';
      setError(msg);
      notify.error(msg);
    }
  };

  const allSelected = modules && modules.length > 0 && selectedModules.length === modules.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl border border-border/50 hover:border-border"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Editar Plano' : 'Novo Plano'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Atualize as informações do plano.'
              : 'Preencha as informações para criar um novo plano.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400 animate-scale-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Info */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base">Informações Gerais</CardTitle>
                <CardDescription>Nome, preço e limites do plano.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {/* Plan Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome do Plano *
                  </Label>
                  <Input
                    id="name"
                    required
                    placeholder="Ex: Básico, Profissional, Enterprise"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11"
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Preço Mensal *
                  </Label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 flex h-11 w-12 items-center justify-center rounded-l-md border-r border-border bg-muted/50">
                      <span className="text-sm font-semibold text-muted-foreground">R$</span>
                    </div>
                    <Input
                      id="price"
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="h-11 pl-14 text-2xl font-bold"
                    />
                  </div>
                </div>

                <Separator />

                {/* Limits with stepper-like UI */}
                <div className="grid grid-cols-2 gap-4">
                  <StepperField
                    id="max_users"
                    label="Max Usuários"
                    icon={Users}
                    value={form.max_users}
                    onChange={(val) => setForm({ ...form, max_users: val })}
                    placeholder="Ilimitado"
                  />
                  <StepperField
                    id="max_products"
                    label="Max Produtos"
                    icon={Package}
                    value={form.max_products}
                    onChange={(val) => setForm({ ...form, max_products: val })}
                    placeholder="Ilimitado"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Deixe vazio para ilimitado.
                </p>

                <Separator />

                {/* Active switch */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      form.is_active
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      <ToggleLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                        {form.is_active ? 'Plano Ativo' : 'Plano Inativo'}
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Planos inativos não ficam disponíveis para novos estabelecimentos.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Modules */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Puzzle className="h-4 w-4 text-primary" />
                      Módulos do Sistema
                    </CardTitle>
                    <CardDescription>
                      Selecione quais módulos estarão disponíveis.
                    </CardDescription>
                  </div>
                  {modules && modules.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs tabular-nums"
                    >
                      {selectedModules.length}/{modules.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Toggle all */}
                {modules && modules.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm font-medium text-foreground">
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </span>
                    <Switch
                      checked={!!allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </div>
                )}

                {/* Module toggle cards */}
                {modules && modules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modules.map((mod: any) => {
                      const isChecked = selectedModules.includes(mod.id);
                      const ModIcon = MODULE_ICONS[mod.key] || Puzzle;

                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isChecked
                              ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/10'
                              : 'border-border hover:border-border hover:bg-muted/50',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                              isChecked
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <ModIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-foreground block truncate">
                              {mod.name}
                            </span>
                            <code className="text-[10px] text-muted-foreground font-mono">
                              {mod.key}
                            </code>
                          </div>
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
                              isChecked
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-transparent',
                            )}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Puzzle className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum módulo cadastrado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-border/50">
          <Button type="submit" disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/plans')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepperField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  icon: any;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const numValue = value ? parseInt(value) : 0;

  const increment = () => {
    onChange(String(numValue + 1));
  };

  const decrement = () => {
    if (numValue > 1) {
      onChange(String(numValue - 1));
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          onClick={decrement}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          id={id}
          type="number"
          min="1"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-center font-semibold"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          onClick={increment}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
