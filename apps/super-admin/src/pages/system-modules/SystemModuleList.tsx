import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { useGetSystemModulesQuery, useDeleteSystemModuleMutation } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function SystemModuleList() {
  const { data: modules, isLoading } = useGetSystemModulesQuery();
  const [deleteModule] = useDeleteSystemModuleMutation();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteModule(deleteTarget.id).unwrap();
      toast.success('Modulo removido!');
    } catch {
      toast.error('Erro ao remover modulo.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Modulos do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os modulos disponiveis para os planos.
          </p>
        </div>
        <Button asChild>
          <Link to="/system-modules/new">
            <Plus className="h-4 w-4" />
            Novo Modulo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Boxes className="h-5 w-5 text-muted-foreground" />
            Modulos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : modules && modules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((mod: any) => (
                  <TableRow key={mod.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                        {mod.key}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{mod.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {mod.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/system-modules/${mod.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: mod.id, name: mod.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Boxes className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhum modulo encontrado</p>
              <p className="text-xs mt-1 opacity-70">Crie o primeiro modulo do sistema.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Modulo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o modulo{' '}
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
              Esta acao nao pode ser desfeita.
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
