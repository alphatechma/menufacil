import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';

export default function PermissionList() {
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = useState('');

  const { data: modules } = useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const response = await api.get('/super-admin/system-modules');
      return response.data;
    },
  });

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', moduleFilter],
    queryFn: async () => {
      const params: any = {};
      if (moduleFilter) params.module_id = moduleFilter;
      const response = await api.get('/super-admin/permissions', { params });
      return response.data;
    },
  });

  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`Deseja remover a permissao "${key}"?`)) return;
    await api.delete(`/super-admin/permissions/${id}`);
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
  };

  // Group permissions by module
  const grouped: Record<string, any[]> = {};
  permissions?.forEach((perm: any) => {
    const moduleName = perm.module?.name || 'Sem Modulo';
    if (!grouped[moduleName]) grouped[moduleName] = [];
    grouped[moduleName].push(perm);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Permissoes</h1>
        <Link
          to="/permissions/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Permissao
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Todos os Modulos</option>
          {modules?.map((mod: any) => (
            <option key={mod.id} value={mod.id}>{mod.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([moduleName, perms]) => (
            <div key={moduleName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">{moduleName}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {perms.map((perm: any) => (
                  <div key={perm.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <code className="px-2 py-0.5 rounded bg-gray-100 text-xs">{perm.key}</code>
                      <span className="text-sm text-gray-700">{perm.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/permissions/${perm.id}/edit`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(perm.id, perm.key)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Nenhuma permissao encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
