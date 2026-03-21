import { useState, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useGetDashboardDataQuery } from '@/api/api';
import { formatPrice } from '@/utils/formatPrice';

function getDateRange(period: string) {
  const now = new Date();
  const until = now.toISOString().split('T')[0];
  let since: string;

  switch (period) {
    case 'today': {
      since = until;
      break;
    }
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      since = d.toISOString().split('T')[0];
      break;
    }
    case 'month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      since = d.toISOString().split('T')[0];
      break;
    }
    default: {
      since = until;
    }
  }
  return { since, until };
}

export default function Dashboard() {
  const [period, setPeriod] = useState('today');
  const { since, until } = useMemo(() => getDateRange(period), [period]);
  const { data, isLoading } = useGetDashboardDataQuery({ since, until });

  const stats = data || {};

  const cards = [
    {
      label: 'Receita',
      value: formatPrice(stats.revenue || stats.total_revenue || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pedidos',
      value: String(stats.orders_count || stats.total_orders || 0),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Ticket Medio',
      value: formatPrice(stats.average_ticket || stats.avg_ticket || 0),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Clientes',
      value: String(stats.customers_count || stats.new_customers || 0),
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {[
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: '7 dias' },
            { key: 'month', label: '30 dias' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.key ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Order status breakdown */}
      {stats.status_breakdown && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Por Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.status_breakdown as Record<string, number>).map(([status, count]) => (
              <div key={status} className="text-center p-3 rounded-xl bg-gray-50">
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment methods breakdown */}
      {stats.payment_breakdown && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Por Pagamento</h2>
          <div className="space-y-2">
            {Object.entries(stats.payment_breakdown as Record<string, number>).map(([method, value]) => {
              const total = stats.revenue || stats.total_revenue || 1;
              const pct = ((value as number) / total) * 100;
              return (
                <div key={method} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 capitalize">{method.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">{formatPrice(value as number)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top products */}
      {stats.top_products && stats.top_products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Produtos Mais Vendidos</h2>
          <div className="space-y-2">
            {stats.top_products.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{p.name || p.product_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{p.quantity || p.count}x</span>
                  <span className="text-sm font-bold text-gray-900">{formatPrice(p.total || p.revenue || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
