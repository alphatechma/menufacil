import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  XCircle,
  Clock,
  Check,
  ChefHat,
  Truck,
  Package,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useGetDashboardDataQuery, useGetOrdersQuery, useGetCustomersQuery } from '@/api/adminApi';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: <Check className="w-3 h-3" /> },
  preparing: { label: 'Preparando', color: 'bg-indigo-100 text-indigo-700', icon: <ChefHat className="w-3 h-3" /> },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-700', icon: <Package className="w-3 h-3" /> },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700', icon: <Check className="w-3 h-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};

function formatDateRange() {
  const now = new Date();
  const since = new Date(now);
  since.setDate(now.getDate() - 6);
  return {
    since: since.toISOString().split('T')[0],
    until: now.toISOString().split('T')[0],
  };
}

export default function Dashboard() {
  const range = useMemo(formatDateRange, []);
  const { data: dashboard, isLoading } = useGetDashboardDataQuery(range);
  const { data: orders = [] } = useGetOrdersQuery();
  const { data: customers = [] } = useGetCustomersQuery();

  if (isLoading) return <PageSpinner />;

  const totalRevenue = Number(dashboard?.totals?.total_revenue || 0);
  const totalOrders = Number(dashboard?.totals?.total_orders || 0);
  const cancelledOrders = Number(dashboard?.totals?.cancelled_orders || 0);
  const validOrders = totalOrders - cancelledOrders;
  const avgTicket = validOrders > 0 ? totalRevenue / validOrders : 0;

  const recentOrders = orders.slice(0, 8);

  const revenueData = (dashboard?.daily || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: Number(d.revenue),
  }));

  const ordersChartData = (dashboard?.daily || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    pedidos: Number(d.orders),
  }));

  const stats = [
    {
      label: 'Receita (7 dias)',
      value: formatPrice(totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Pedidos (7 dias)',
      value: String(validOrders),
      icon: ShoppingCart,
      bgColor: 'bg-orange-50',
      iconColor: 'text-primary',
    },
    {
      label: 'Ticket Medio',
      value: formatPrice(avgTicket),
      icon: TrendingUp,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Clientes',
      value: String(customers.length),
      icon: Users,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visao geral do seu restaurante</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita (7 dias)</h3>
          <div className="h-64">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatPrice(value), 'Receita']} />
                  <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados no periodo</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por Dia</h3>
          <div className="h-64">
            {ordersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pedidos" fill="#FF6B35" radius={[6, 6, 0, 0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados no periodo</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h3>
          <Link to="/admin/orders" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order: any) => {
                  const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/orders/${order.id}`} className="text-sm font-medium text-primary hover:underline">
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{order.customer?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{formatPrice(order.total || 0)}</td>
                      <td className="px-5 py-3.5">
                        <Badge className={status.color}>
                          {status.icon}
                          <span className="ml-1">{status.label}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {order.created_at ? new Date(order.created_at.endsWith('Z') ? order.created_at : order.created_at + 'Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">Nenhum pedido registrado</div>
        )}
      </div>
    </div>
  );
}
