import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function FormSkeleton() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-5">
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

const NO_MODULE = '__none__';

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
  const [error, setError] = useState('');

  const saving = creating || updating;

  useEffect(() => {
    if (permission) {
      setForm({
        key: permission.key || '',
        name: permission.name || '',
        module_id: permission.module_id || '',
      });
    }
  }, [permission]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isEditing && loadingPermission ? (
        <FormSkeleton />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informacoes da Permissão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  required
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="product:create"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Formato recomendado: recurso:acao (ex: product:create, order:read)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Criar Produto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="module">Modulo</Label>
                <Select
                  value={form.module_id || NO_MODULE}
                  onValueChange={(value) =>
                    setForm({ ...form, module_id: value === NO_MODULE ? '' : value })
                  }
                >
                  <SelectTrigger id="module">
                    <SelectValue placeholder="Selecione um modulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODULE}>Sem modulo</SelectItem>
                    {modules?.map((mod: any) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Opcional. Associe a permissão a um módulo do sistema.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
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
