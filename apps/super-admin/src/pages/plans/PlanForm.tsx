import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
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

      navigate('/plans');
    } catch (err: any) {
      setError(
        err?.data?.message || err?.message || 'Erro ao salvar plano',
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Editar Plano' : 'Novo Plano'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing
              ? 'Atualize as informações do plano.'
              : 'Preencha as informações para criar um novo plano.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>
              Nome, preço e limites do plano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                required
                placeholder="Ex: Básico, Profissional, Enterprise"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Max Usuários</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={form.max_users}
                  onChange={(e) =>
                    setForm({ ...form, max_users: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para ilimitado.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_products">Max Produtos</Label>
                <Input
                  id="max_products"
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={form.max_products}
                  onChange={(e) =>
                    setForm({ ...form, max_products: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para ilimitado.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Planos inativos não ficam disponíveis para novos
                  estabelecimentos.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos do Sistema</CardTitle>
            <CardDescription>
              Selecione quais módulos estarão disponíveis neste plano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modules && modules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modules.map((mod: any) => {
                  const isChecked = selectedModules.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border hover:border-muted-foreground/25'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleModule(mod.id)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium leading-none">
                          {mod.name}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {mod.key}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum módulo cadastrado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/plans')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
