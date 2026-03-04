import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    price: '',
    max_users: '',
    max_products: '',
    is_active: true,
  });
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: plan } = useQuery({
    queryKey: ['plan', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/plans/${id}`);
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
    if (plan) {
      setForm({
        name: plan.name || '',
        price: String(plan.price) || '',
        max_users: plan.max_users != null ? String(plan.max_users) : '',
        max_products: plan.max_products != null ? String(plan.max_products) : '',
        is_active: plan.is_active,
      });
      setSelectedModules(plan.modules?.map((m: any) => m.id) || []);
    }
  }, [plan]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        max_users: form.max_users ? parseInt(form.max_users) : null,
        max_products: form.max_products ? parseInt(form.max_products) : null,
        is_active: form.is_active,
      };

      if (isEditing) {
        await api.put(`/super-admin/plans/${id}`, payload);
        await api.put(`/super-admin/plans/${id}/modules`, { module_ids: selectedModules });
      } else {
        const response = await api.post('/super-admin/plans', payload);
        await api.put(`/super-admin/plans/${response.data.id}/modules`, { module_ids: selectedModules });
      }
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate('/plans');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar plano');
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
          {isEditing ? 'Editar Plano' : 'Novo Plano'}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Preco (R$)</label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Max Usuarios <span className="text-gray-400">(vazio = ilimitado)</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.max_users}
              onChange={(e) => setForm({ ...form, max_users: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Max Produtos <span className="text-gray-400">(vazio = ilimitado)</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.max_products}
              onChange={(e) => setForm({ ...form, max_products: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Ativo</label>
        </div>

        {/* Modules */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modulos do Sistema</label>
          <div className="grid grid-cols-2 gap-2">
            {modules?.map((mod: any) => (
              <label
                key={mod.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModules.includes(mod.id)
                    ? 'border-primary bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(mod.id)}
                  onChange={() => toggleModule(mod.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                  <p className="text-xs text-gray-500">{mod.key}</p>
                </div>
              </label>
            ))}
          </div>
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
