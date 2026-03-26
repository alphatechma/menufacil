import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ChevronDown,
  ChevronRight,
  Search,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Tag,
  Heart,
  Monitor,
  BarChart3,
  Puzzle,
  Lock,
} from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetPermissionsQuery,
  useGetSystemModulesQuery,
  useDeletePermissionMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
};

const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  create: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  read: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  update: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  delete: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  manage: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
};

const DEFAULT_ACTION_COLOR = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };

function getActionFromKey(key: string): string {
  const parts = key.split(':');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function getActionColor(key: string) {
  const action = getActionFromKey(key);
  return ACTION_COLORS[action] || DEFAULT_ACTION_COLOR;
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-2 pl-8">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PermissionList() {
  const notify = useNotify();
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__all__']));

  const { data: modules } = useGetSystemModulesQuery();
  const { data: permissions, isLoading } = useGetPermissionsQuery(
    moduleFilter && moduleFilter !== 'all' ? { module_id: moduleFilter } : undefined,
  );
  const [deletePermission] = useDeletePermissionMutation();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePermission(deleteTarget.id).unwrap();
      notify.success('Permissão removida!');
    } catch {
      notify.error('Erro ao remover permissão.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filter by search
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];
    if (!searchQuery.trim()) return permissions;
    const q = searchQuery.toLowerCase();
    return permissions.filter(
      (perm: any) =>
        perm.key?.toLowerCase().includes(q) ||
        perm.name?.toLowerCase().includes(q) ||
        perm.module?.name?.toLowerCase().includes(q),
    );
  }, [permissions, searchQuery]);

  // Group permissions by module
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPermissions.forEach((perm: any) => {
      const moduleName = perm.module?.name || 'Sem Módulo';
      if (!groups[moduleName]) groups[moduleName] = [];
      groups[moduleName].push(perm);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPermissions]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Auto-expand all groups on initial load
  const isAllExpanded = expandedGroups.has('__all__');

  const totalPermissions = permissions?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Permissões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as permissões granulares do sistema.
          </p>
        </div>
        <Button asChild>
          <Link to="/permissions/new">
            <Plus className="h-4 w-4" />
            Nova Permissão
          </Link>
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar permissões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Módulos</SelectItem>
            {modules?.map((mod: any) => (
              <SelectItem key={mod.id} value={mod.id}>
                {mod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && (
          <Badge variant="secondary" className="self-center text-xs whitespace-nowrap">
            {totalPermissions} {totalPermissions === 1 ? 'permissão' : 'permissões'}
          </Badge>
        )}
      </div>

      {/* Permission groups */}
      {isLoading ? (
        <ListSkeleton />
      ) : grouped.length > 0 ? (
        <div className="space-y-3">
          {grouped.map(([moduleName, perms]) => {
            const isExpanded = isAllExpanded || expandedGroups.has(moduleName);
            const moduleKey = perms[0]?.module?.key || '';
            const ModIcon = MODULE_ICON_MAP[moduleKey] || Shield;

            return (
              <div
                key={moduleName}
                className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200"
              >
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => {
                    if (isAllExpanded) {
                      // Switch from "all expanded" to individual tracking
                      const allNames = grouped.map(([name]) => name);
                      const newSet = new Set(allNames.filter((n) => n !== moduleName));
                      setExpandedGroups(newSet);
                    } else {
                      toggleGroup(moduleName);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                    <ModIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {moduleName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {perms.length}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                  )}
                </button>

                {/* Expanded permissions */}
                {isExpanded && (
                  <div className="border-t border-border/50">
                    {perms.map((perm: any, idx: number) => {
                      const actionColor = getActionColor(perm.key);

                      return (
                        <div
                          key={perm.id}
                          className={cn(
                            'group/row flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30',
                            idx < perms.length - 1 && 'border-b border-border/30',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-medium',
                                actionColor.bg,
                                actionColor.text,
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', actionColor.dot)} />
                              {perm.key}
                            </div>
                            <span className="text-sm text-foreground">{perm.name}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link to={`/permissions/${perm.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget({ id: perm.id, key: perm.key })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/10">
              <Lock className="h-10 w-10 text-primary/60" />
            </div>
            {!searchQuery && (
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? 'Nenhuma permissão encontrada' : 'Nenhuma permissão cadastrada'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {searchQuery
              ? `Nenhum resultado para "${searchQuery}". Tente outra busca.`
              : 'Crie a primeira permissão do sistema para controle de acesso granular.'}
          </p>
          {!searchQuery && (
            <Button asChild>
              <Link to="/permissions/new">
                <Plus className="h-4 w-4" />
                Criar Primeira Permissão
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent onKeyDown={(e) => { if (e.key === 'Enter' && !deleting) { e.preventDefault(); handleDelete(); } }}>
          <DialogHeader>
            <DialogTitle>Remover Permissão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a permissão{' '}
              <code className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
                {deleteTarget?.key}
              </code>
              ? Esta ação não pode ser desfeita.
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
