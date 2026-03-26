import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Boxes,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Tag,
  Heart,
  Monitor,
  BarChart3,
  Ticket,
  Settings,
  Puzzle,
} from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { useGetSystemModulesQuery, useDeleteSystemModuleMutation } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ticket: Ticket,
  settings: Settings,
};

const GRADIENT_COLORS = [
  { border: 'from-indigo-500 to-violet-500', bg: 'rgba(99, 102, 241, 0.08)', text: 'text-indigo-500' },
  { border: 'from-emerald-500 to-teal-500', bg: 'rgba(16, 185, 129, 0.08)', text: 'text-emerald-500' },
  { border: 'from-amber-500 to-orange-500', bg: 'rgba(245, 158, 11, 0.08)', text: 'text-amber-500' },
  { border: 'from-rose-500 to-pink-500', bg: 'rgba(244, 63, 94, 0.08)', text: 'text-rose-500' },
  { border: 'from-cyan-500 to-blue-500', bg: 'rgba(6, 182, 212, 0.08)', text: 'text-cyan-500' },
  { border: 'from-purple-500 to-fuchsia-500', bg: 'rgba(168, 85, 247, 0.08)', text: 'text-purple-500' },
  { border: 'from-lime-500 to-green-500', bg: 'rgba(132, 204, 22, 0.08)', text: 'text-lime-500' },
  { border: 'from-sky-500 to-indigo-500', bg: 'rgba(14, 165, 233, 0.08)', text: 'text-sky-500' },
];

function ModuleCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function SystemModuleList() {
  const notify = useNotify();
  const { data: modules, isLoading } = useGetSystemModulesQuery();
  const [deleteModule] = useDeleteSystemModuleMutation();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteModule(deleteTarget.id).unwrap();
      notify.success('Módulo removido!');
    } catch {
      notify.error('Erro ao remover módulo.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Módulos do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os módulos disponíveis para os planos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && modules && (
            <Badge variant="secondary" className="text-xs">
              {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
            </Badge>
          )}
          <Button asChild>
            <Link to="/system-modules/new">
              <Plus className="h-4 w-4" />
              Novo Módulo
            </Link>
          </Button>
        </div>
      </div>

      {/* Module cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {modules.map((mod: any, index: number) => {
            const color = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
            const Icon = MODULE_ICON_MAP[mod.key] || Puzzle;

            return (
              <div
                key={mod.id}
                className={cn(
                  'group relative rounded-2xl border border-border bg-card overflow-hidden',
                  'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-border',
                )}
              >
                {/* Gradient top border */}
                <div className={cn('h-1 bg-gradient-to-r', color.border)} />

                <div className="p-5 space-y-4">
                  {/* Icon and actions */}
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl',
                        color.text,
                      )}
                      style={{ backgroundColor: color.bg }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Actions - visible on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link to={`/system-modules/${mod.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget({ id: mod.id, name: mod.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-sm font-semibold text-foreground">{mod.name}</h3>

                  {/* Key badge */}
                  <code className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
                    {mod.key}
                  </code>

                  {/* Description */}
                  {mod.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/10">
              <Boxes className="h-10 w-10 text-primary/60" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum módulo encontrado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Crie o primeiro módulo do sistema para associar aos planos.
          </p>
          <Button asChild>
            <Link to="/system-modules/new">
              <Plus className="h-4 w-4" />
              Criar Primeiro Módulo
            </Link>
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent onKeyDown={(e) => { if (e.key === 'Enter' && !deleting) { e.preventDefault(); handleDelete(); } }}>
          <DialogHeader>
            <DialogTitle>Remover Módulo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o módulo{' '}
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
