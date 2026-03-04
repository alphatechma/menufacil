import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';

export default function TenantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    plan_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: tenant } = useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/tenants/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/super-admin/plans');
      return response.data;
    },
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        slug: tenant.slug || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        plan_id: tenant.plan_id || '',
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/super-admin/tenants/${id}`, form);
      } else {
        await api.post('/super-admin/tenants', form);
      }
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/tenants');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar tenant');
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
          {isEditing ? 'Editar Tenant' : 'Novo Tenant'}
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug</label>
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="meu-restaurante"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereco</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plano</label>
          <select
            value={form.plan_id}
            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Sem plano</option>
            {plans?.map((plan: any) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - R$ {Number(plan.price).toFixed(2)}
              </option>
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
