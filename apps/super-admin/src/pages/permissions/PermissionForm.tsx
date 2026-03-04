import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';

export default function PermissionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({ key: '', name: '', module_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: permission } = useQuery({
    queryKey: ['permission', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/permissions/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  const { data: modules } = useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const response = await api.get('/super-admin/system-modules');
      return response.data;
    },
  });

  useEffect(() => {
    if (permission) {
      setForm({
        key: permission.key || '',
        name: permission.name || '',
        module_id: permission.module_id || '',
      });
    }
  }, [permission]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        module_id: form.module_id || undefined,
      };

      if (isEditing) {
        await api.put(`/super-admin/permissions/${id}`, payload);
      } else {
        await api.post('/super-admin/permissions', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      navigate('/permissions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar permissao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Permissao' : 'Nova Permissao'}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Key</label>
          <input
            type="text"
            required
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="product:create"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Criar Produto"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Modulo</label>
          <select
            value={form.module_id}
            onChange={(e) => setForm({ ...form, module_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Sem modulo</option>
            {modules?.map((mod: any) => (
              <option key={mod.id} value={mod.id}>{mod.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
