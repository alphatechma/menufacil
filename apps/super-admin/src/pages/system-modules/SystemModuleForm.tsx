import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import {
  useGetSystemModuleQuery,
  useCreateSystemModuleMutation,
  useUpdateSystemModuleMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function FormSkeleton() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
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
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </CardContent>
    </Card>
  );
}

export default function SystemModuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      } else {
        await createModule(form).unwrap();
      }
      navigate('/system-modules');
    } catch (err: any) {
      setError(err?.data?.message || 'Erro ao salvar modulo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Editar Modulo' : 'Novo Modulo'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Atualize as informacoes do modulo.'
              : 'Preencha os dados para criar um novo modulo.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isEditing && loadingModule ? (
        <FormSkeleton />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informacoes do Modulo</CardTitle>
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
                  placeholder="delivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Delivery"
                />
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

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
