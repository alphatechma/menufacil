import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Shield,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Tag,
  Heart,
  Monitor,
  BarChart3,
  Puzzle,
} from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetPermissionQuery,
  useGetSystemModulesQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MODULE_ICON_MAP: Record<string, any> = {
  product: Package,
  order: ShoppingCart,
  customer: Users,
  delivery: Truck,
  coupon: Tag,
  loyalty: Heart,
  kds: Monitor,
  report: BarChart3,
};

const RESOURCES = [
  'product', 'category', 'order', 'customer', 'delivery',
  'coupon', 'loyalty', 'kds', 'report', 'staff', 'role', 'settings',
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  read: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  update: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  delete: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600 dark:text-red-400' },
  manage: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
};

const NO_MODULE = '__none__';

function FormSkeleton() {
  return (
    <Card className="max-w-2xl">
      <CardHeader className="border-b border-border/50 bg-muted/30">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </CardContent>
    </Card>
  );
}

export default function PermissionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!id;

  const { data: permission, isLoading: loadingPermission } = useGetPermissionQuery(id!, {
    skip: !isEditing,
  });
  const { data: modules } = useGetSystemModulesQuery();
  const [createPermission, { isLoading: creating }] = useCreatePermissionMutation();
  const [updatePermission, { isLoading: updating }] = useUpdatePermissionMutation();

  const [form, setForm] = useState({ key: '', name: '', module_id: '' });
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [error, setError] = useState('');

  const saving = creating || updating;

  useEffect(() => {
    if (permission) {
      setForm({
        key: permission.key || '',
        name: permission.name || '',
        module_id: permission.module_id || '',
      });
      // Parse key into resource:action
      if (permission.key) {
        const parts = permission.key.split(':');
        if (parts.length >= 2) {
          setSelectedResource(parts[0]);
          setSelectedAction(parts.slice(1).join(':'));
        }
      }
    }
  }, [permission]);

  // Sync resource+action selection to key
  const handleResourceChange = (resource: string) => {
    setSelectedResource(resource);
    if (resource && selectedAction) {
      setForm((prev) => ({ ...prev, key: `${resource}:${selectedAction}` }));
    }
  };

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    if (selectedResource && action) {
      setForm((prev) => ({ ...prev, key: `${selectedResource}:${action}` }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        ...form,
        module_id: form.module_id || undefined,
      };

      if (isEditing) {
        await updatePermission({ id: id!, data: payload }).unwrap();
        notify.success('Permissão atualizada!');
      } else {
        await createPermission(payload).unwrap();
        notify.success('Permissão criada!');
      }
      navigate('/permissions');
    } catch (err: any) {
      const msg = err?.data?.message || 'Erro ao salvar permissão';
      setError(msg);
      notify.error(msg);
    }
  };

  const selectedModuleObj = modules?.find((m: any) => m.id === form.module_id);
  const ModuleIcon = selectedModuleObj ? (MODULE_ICON_MAP[selectedModuleObj.key] || Puzzle) : Shield;

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
            {isEditing ? 'Editar Permissão' : 'Nova Permissão'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Atualize as informações da permissão.'
              : 'Preencha os dados para criar uma nova permissão.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400 animate-scale-in max-w-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {isEditing && loadingPermission ? (
        <FormSkeleton />
      ) : (
        <Card className="max-w-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Informações da Permissão
            </CardTitle>
            <CardDescription>
              Defina a chave, nome e módulo da permissão.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Key Builder */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Construtor de Key
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">Recurso</span>
                    <div className="flex flex-wrap gap-1.5">
                      {RESOURCES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleResourceChange(r)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-all',
                            selectedResource === r
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">Ação</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIONS.map((a) => {
                        const color = ACTION_COLORS[a] || { bg: 'bg-muted', text: 'text-muted-foreground' };
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => handleActionChange(a)}
                            className={cn(
                              'rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-all',
                              selectedAction === a
                                ? cn(color.bg, color.text, 'border-current/20')
                                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                            )}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key input (also manually editable) */}
              <div className="space-y-2">
                <Label htmlFor="key" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key *
                </Label>
                <Input
                  id="key"
                  required
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="product:create"
                  className="font-mono text-sm h-11"
                />
                {form.key && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">Preview:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-mono text-[11px]',
                        getActionStyleForBadge(form.key),
                      )}
                    >
                      {form.key}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome *
                </Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Criar Produto"
                  className="h-11"
                />
              </div>

              {/* Module */}
              <div className="space-y-2">
                <Label htmlFor="module" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Módulo
                </Label>
                <Select
                  value={form.module_id || NO_MODULE}
                  onValueChange={(value) =>
                    setForm({ ...form, module_id: value === NO_MODULE ? '' : value })
                  }
                >
                  <SelectTrigger id="module" className="h-11">
                    <div className="flex items-center gap-2">
                      <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Selecione um módulo" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODULE}>Sem módulo</SelectItem>
                    {modules?.map((mod: any) => {
                      const Icon = MODULE_ICON_MAP[mod.key] || Puzzle;
                      return (
                        <SelectItem key={mod.id} value={mod.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {mod.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Opcional. Associe a permissão a um módulo do sistema.
                </p>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/permissions')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getActionStyleForBadge(key: string): string {
  const action = key.split(':').pop() || '';
  const color = ACTION_COLORS[action];
  if (!color) return '';
  return cn(color.bg, color.text);
}
