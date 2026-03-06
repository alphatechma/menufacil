import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useGetDeliveryZonesQuery, useDeleteDeliveryZoneMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/utils/formatPrice';

export default function DeliveryZoneList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: zones = [], isLoading } = useGetDeliveryZonesQuery();
  const [deleteZone, { isLoading: isDeleting }] = useDeleteDeliveryZoneMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return zones;
    const term = search.toLowerCase();
    return zones.filter((zone: any) =>
      zone.name?.toLowerCase().includes(term),
    );
  }, [zones, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteZone(deleteTarget.id).unwrap();
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Zonas de Entrega</h1>
        <Link to="/admin/delivery-zones/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Zona
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-12 h-12" />}
          title="Nenhuma zona de entrega encontrada"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Crie sua primeira zona de entrega para definir areas de cobertura.'
          }
          action={
            !search ? (
              <Link to="/admin/delivery-zones/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Nova Zona
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Taxa
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bairros
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tempo Estimado
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map((zone: any) => (
                  <tr key={zone.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{zone.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {formatPrice(zone.fee)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {zone.neighborhoods?.length ?? 0} bairro{(zone.neighborhoods?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {zone.min_delivery_time}-{zone.max_delivery_time} min
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/delivery-zones/${zone.id}/edit`}>
                          <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: zone.id, name: zone.name })}
                          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
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
        title="Excluir Zona de Entrega"
        message={`Tem certeza que deseja excluir a zona "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
