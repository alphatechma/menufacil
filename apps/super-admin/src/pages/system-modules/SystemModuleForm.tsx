import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';

export default function SystemModuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: mod } = useQuery({
    queryKey: ['system-module', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/system-modules/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (mod) {
      setForm({ key: mod.key || '', name: mod.name || '', description: mod.description || '' });
    }
  }, [mod]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/super-admin/system-modules/${id}`, form);
      } else {
        await api.post('/super-admin/system-modules', form);
      }
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      navigate('/system-modules');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar modulo');
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
          {isEditing ? 'Editar Modulo' : 'Novo Modulo'}
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
            placeholder="delivery"
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
            placeholder="Delivery"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descricao</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
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
