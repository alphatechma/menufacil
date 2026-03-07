import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Truck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useGetDeliveryPersonsQuery, useDeleteDeliveryPersonMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function DeliveryPersonList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: persons = [], isLoading } = useGetDeliveryPersonsQuery();
  const [deletePerson, { isLoading: isDeleting }] = useDeleteDeliveryPersonMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return persons;
    const term = search.toLowerCase();
    return persons.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(term) ||
        p.phone?.includes(term),
    );
  }, [persons, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePerson(deleteTarget.id).unwrap();
      toast.success('Entregador excluido com sucesso!');
    } catch {
      toast.error('Erro ao excluir entregador. Tente novamente.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Entregadores</h1>
        <Link to="/admin/delivery-persons/new">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Entregador
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou telefone..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-12 h-12" />}
          title="Nenhum entregador encontrado"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Cadastre seu primeiro entregador para gerenciar as entregas.'
          }
          action={
            !search ? (
              <Link to="/admin/delivery-persons/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Novo Entregador
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Veiculo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((person: any) => (
                  <tr key={person.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-purple-500" />
                        </div>
                        <span className="font-medium text-foreground">{person.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{person.phone}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{person.vehicle || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          person.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {person.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/delivery-persons/${person.id}`}>
                          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link to={`/admin/delivery-persons/${person.id}/edit`}>
                          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: person.id, name: person.name })}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Entregador"
        message={`Tem certeza que deseja excluir o entregador "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
