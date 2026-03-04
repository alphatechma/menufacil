import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';

export default function SystemModuleList() {
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const response = await api.get('/super-admin/system-modules');
      return response.data;
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o modulo "${name}"?`)) return;
    await api.delete(`/super-admin/system-modules/${id}`);
    queryClient.invalidateQueries({ queryKey: ['system-modules'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Modulos do Sistema</h1>
        <Link
          to="/system-modules/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Modulo
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Key</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descricao</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules?.map((mod: any) => (
                  <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="px-2 py-0.5 rounded bg-gray-100 text-sm">{mod.key}</code>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{mod.name}</td>
                    <td className="px-4 py-3 text-gray-500">{mod.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/system-modules/${mod.id}/edit`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(mod.id, mod.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {modules?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Nenhum modulo encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
