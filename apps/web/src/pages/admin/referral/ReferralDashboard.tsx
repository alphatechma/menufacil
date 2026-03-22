import { Users, UserPlus, TrendingUp, Gift } from 'lucide-react';
import { useGetReferralStatsQuery } from '@/api/adminApi';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReferralDashboard() {
  const { data: stats, isLoading } = useGetReferralStatsQuery();

  if (isLoading) return <ListPageSkeleton />;

  const statCards = [
    {
      label: 'Total de Indicacoes',
      value: stats?.total_referrals ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Convertidas',
      value: stats?.successful_referrals ?? 0,
      icon: UserPlus,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Taxa de Conversao',
      value: `${stats?.conversion_rate ?? 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Pontos Concedidos',
      value: stats?.total_points_awarded ?? 0,
      icon: Gift,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Programa de Indicação</h2>
        <p className="text-sm text-gray-500">Acompanhe as indicações dos clientes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Top Referrers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Top Indicadores</h3>
        </div>
        {stats?.top_referrers && stats.top_referrers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Indicacoes</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_referrers.map((referrer: any, idx: number) => (
                  <tr key={referrer.referrer_id} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-3 px-5 text-sm text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-900">{referrer.name || '-'}</td>
                    <td className="py-3 px-5 text-sm text-gray-500">{referrer.phone || '-'}</td>
                    <td className="py-3 px-5 text-sm text-right text-gray-900 font-semibold">{referrer.count}</td>
                    <td className="py-3 px-5 text-sm text-right text-primary font-semibold">
                      {referrer.total_points || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="Nenhuma indicação ainda"
              description="Quando seus clientes indicarem amigos, os dados aparecerão aqui"
            />
          </div>
        )}
      </div>
    </div>
  );
}
