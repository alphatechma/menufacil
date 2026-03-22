import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetSystemModuleQuery,
  useCreateSystemModuleMutation,
  useUpdateSystemModuleMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function FormSkeleton() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-28" />
      </CardContent>
    </Card>
  );
}

export default function SystemModuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!id;

  const { data: mod, isLoading: loadingModule } = useGetSystemModuleQuery(id!, { skip: !isEditing });
  const [createModule, { isLoading: creating }] = useCreateSystemModuleMutation();
  const [updateModule, { isLoading: updating }] = useUpdateSystemModuleMutation();

  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [error, setError] = useState('');

  const saving = creating || updating;

  useEffect(() => {
    if (mod) {
      setForm({
        key: mod.key || '',
        name: mod.name || '',
        description: mod.description || '',
      });
    }
  }, [mod]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEditing) {
        await updateModule({ id: id!, data: form }).unwrap();
        notify.success('Módulo atualizado!');
      } else {
        await createModule(form).unwrap();
        notify.success('Módulo criado com sucesso!');
      }
      navigate('/system-modules');
    } catch (err: any) {
      const msg = err?.data?.message || 'Erro ao salvar modulo';
      setError(msg);
      notify.error(msg);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {isEditing ? 'Editar Módulo' : 'Novo Módulo'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {isEditing
              ? 'Atualize as informações do módulo.'
              : 'Preencha os dados para criar um novo módulo.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-scale-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {isEditing && loadingModule ? (
        <FormSkeleton />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informacoes do Módulo</CardTitle>
            <CardDescription>Defina a chave, nome e descrição do módulo.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key">Key *</Label>
                  <Input
                    id="key"
                    required
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="delivery"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Identificador único, sem espaços.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Delivery"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descricao do modulo..."
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/system-modules')}>
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
