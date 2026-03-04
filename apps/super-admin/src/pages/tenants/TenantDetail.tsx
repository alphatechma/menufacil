import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Power } from 'lucide-react';
import api from '../../services/api';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/tenants/${id}`);
      return response.data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/super-admin/plans');
      return response.data;
    },
  });

  const handleToggleActive = async () => {
    await api.patch(`/super-admin/tenants/${id}/toggle-active`);
    queryClient.invalidateQueries({ queryKey: ['tenant', id] });
  };

  const handleChangePlan = async (planId: string) => {
    await api.patch(`/super-admin/tenants/${id}/plan`, { plan_id: planId });
    queryClient.invalidateQueries({ queryKey: ['tenant', id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-500">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/tenants/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tenant.is_active
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {tenant.is_active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informacoes</h2>
          <div className="space-y-3">
            <InfoRow label="Nome" value={tenant.name} />
            <InfoRow label="Slug" value={tenant.slug} />
            <InfoRow label="Telefone" value={tenant.phone || '-'} />
            <InfoRow label="Endereco" value={tenant.address || '-'} />
            <InfoRow
              label="Status"
              value={
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {tenant.is_active ? 'Ativo' : 'Inativo'}
                </span>
              }
            />
            <InfoRow label="Criado em" value={new Date(tenant.created_at).toLocaleDateString('pt-BR')} />
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Plano</h2>
          <div className="space-y-3">
            <InfoRow
              label="Plano Atual"
              value={
                tenant.plan ? (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary">
                    {tenant.plan.name} - R$ {Number(tenant.plan.price).toFixed(2)}
                  </span>
                ) : (
                  'Sem plano'
                )
              }
            />
            {tenant.plan?.modules && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Modulos inclusos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tenant.plan.modules.map((mod: any) => (
                    <span key={mod.id} className="inline-flex px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700">
                      {mod.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trocar Plano</label>
            <select
              value={tenant.plan_id || ''}
              onChange={(e) => handleChangePlan(e.target.value)}
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
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
