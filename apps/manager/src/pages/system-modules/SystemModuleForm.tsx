import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Tag,
  Heart,
  Monitor,
  BarChart3,
  Puzzle,
  Eye,
} from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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

const MAX_DESCRIPTION = 200;

function FormSkeleton() {
  return (
    <Card className="max-w-3xl">
      <CardHeader className="border-b border-border/50 bg-muted/30">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
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

  const handleKeyChange = (value: string) => {
    // Auto-format: lowercase, no spaces (replace with underscore)
    const formatted = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setForm({ ...form, key: formatted });
  };

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
      const msg = err?.data?.message || 'Erro ao salvar módulo';
      setError(msg);
      notify.error(msg);
    }
  };

  const PreviewIcon = MODULE_ICON_MAP[form.key] || Puzzle;
  const descriptionLength = form.description.length;

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
            {isEditing ? 'Editar Módulo' : 'Novo Módulo'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Atualize as informações do módulo.'
              : 'Preencha os dados para criar um novo módulo.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400 animate-scale-in max-w-3xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {isEditing && loadingModule ? (
        <FormSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base">Informações do Módulo</CardTitle>
                <CardDescription>Defina a chave, nome e descrição do módulo.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} id="module-form" className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Key */}
                    <div className="space-y-2">
                      <Label htmlFor="key" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Key *
                      </Label>
                      <Input
                        id="key"
                        required
                        value={form.key}
                        onChange={(e) => handleKeyChange(e.target.value)}
                        placeholder="delivery"
                        className="font-mono text-sm h-11"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Identificador único. Apenas letras minúsculas, números e underscores.
                      </p>
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
                        placeholder="Delivery"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Descrição
                      </Label>
                      <span
                        className={cn(
                          'text-[10px] tabular-nums',
                          descriptionLength > MAX_DESCRIPTION
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {descriptionLength}/{MAX_DESCRIPTION}
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descrição do módulo..."
                      rows={4}
                      maxLength={MAX_DESCRIPTION}
                    />
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
                    <Button type="button" variant="outline" onClick={() => navigate('/system-modules')}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div>
            <Card className="overflow-hidden sticky top-6">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Gradient top */}
                  <div className="h-1 bg-gradient-to-r from-primary to-violet-500" />
                  <div className="p-5 space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <PreviewIcon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {form.name || 'Nome do módulo'}
                    </h4>
                    {form.key && (
                      <code className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
                        {form.key}
                      </code>
                    )}
                    {form.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Assim o módulo aparecerá na listagem.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
