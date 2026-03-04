import { useQuery } from '@tanstack/react-query';
import { Building2, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/super-admin/dashboard/stats');
      return response.data;
    },
  });

  const cards = [
    {
      label: 'Total Tenants',
      value: stats?.total_tenants ?? 0,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Tenants Ativos',
      value: stats?.active_tenants ?? 0,
      icon: Building2,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Total Usuarios',
      value: stats?.total_users ?? 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Receita Total',
      value: `R$ ${(stats?.total_revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants by Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenants por Plano</h2>
          {stats?.tenants_by_plan?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.tenants_by_plan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="plan_name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Tenants" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              Nenhum dado disponivel
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total de Pedidos</span>
              <span className="text-sm font-semibold text-gray-900">{stats?.total_orders ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Tenants Ativos</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats?.active_tenants ?? 0} / {stats?.total_tenants ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Ticket Medio</span>
              <span className="text-sm font-semibold text-gray-900">
                R$ {stats?.total_orders > 0
                  ? (stats.total_revenue / stats.total_orders).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
