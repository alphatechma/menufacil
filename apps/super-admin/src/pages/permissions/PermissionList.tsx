import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import {
  useGetPermissionsQuery,
  useGetSystemModulesQuery,
  useDeletePermissionMutation,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PermissionList() {
  const [moduleFilter, setModuleFilter] = useState<string>('all');
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
    } catch {
      // error handled by RTK Query
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Group permissions by module
  const grouped: Record<string, any[]> = {};
  permissions?.forEach((perm: any) => {
    const moduleName = perm.module?.name || 'Sem Modulo';
    if (!grouped[moduleName]) grouped[moduleName] = [];
    grouped[moduleName].push(perm);
  });

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Permissoes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as permissoes granulares do sistema.
          </p>
        </div>
        <Button asChild>
          <Link to="/permissions/new">
            <Plus className="h-4 w-4" />
            Nova Permissao
          </Link>
        </Button>
      </div>

      {/* Module filter */}
      <div className="flex gap-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Modulos</SelectItem>
            {modules?.map((mod: any) => (
              <SelectItem key={mod.id} value={mod.id}>
                {mod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : sortedGroups.length > 0 ? (
        <div className="space-y-4">
          {sortedGroups.map(([moduleName, perms]) => (
            <Card key={moduleName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {moduleName}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {perms.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {perms.map((perm: any) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          {perm.key}
                        </code>
                        <span className="text-sm text-foreground">{perm.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/permissions/${perm.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: perm.id, key: perm.key })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Shield className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma permissao encontrada</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Permissao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a permissao{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground">
                {deleteTarget?.key}
              </code>
              ? Esta acao nao pode ser desfeita.
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
