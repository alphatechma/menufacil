import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Truck, Eye } from 'lucide-react';
import { useGetDeliveryPersonsQuery, useDeleteDeliveryPersonMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
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
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entregadores</h1>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Veiculo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((person: any) => (
                  <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-purple-500" />
                        </div>
                        <span className="font-medium text-gray-900">{person.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{person.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{person.vehicle || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          person.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }
                      >
                        {person.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/delivery-persons/${person.id}`}>
                          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link to={`/admin/delivery-persons/${person.id}/edit`}>
                          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: person.id, name: person.name })}
                          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
