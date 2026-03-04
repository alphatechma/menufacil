import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
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

const revenueData = [
  { name: 'Seg', value: 1200 },
  { name: 'Ter', value: 1800 },
  { name: 'Qua', value: 1500 },
  { name: 'Qui', value: 2200 },
  { name: 'Sex', value: 2800 },
  { name: 'Sab', value: 3200 },
  { name: 'Dom', value: 2600 },
];

const ordersData = [
  { name: 'Seg', orders: 32 },
  { name: 'Ter', orders: 45 },
  { name: 'Qua', orders: 38 },
  { name: 'Qui', orders: 52 },
  { name: 'Sex', orders: 65 },
  { name: 'Sab', orders: 78 },
  { name: 'Dom', orders: 60 },
];

const recentOrders = [
  { id: '#1234', customer: 'Maria Silva', total: 89.90, status: 'Entregue', time: '10 min' },
  { id: '#1235', customer: 'Joao Santos', total: 45.50, status: 'Em preparo', time: '5 min' },
  { id: '#1236', customer: 'Ana Costa', total: 120.00, status: 'Saiu para entrega', time: '15 min' },
  { id: '#1237', customer: 'Pedro Lima', total: 67.80, status: 'Pendente', time: '2 min' },
  { id: '#1238', customer: 'Carla Dias', total: 95.40, status: 'Entregue', time: '25 min' },
];

const statusColors: Record<string, string> = {
  'Pendente': 'bg-yellow-100 text-yellow-800',
  'Em preparo': 'bg-blue-100 text-blue-800',
  'Saiu para entrega': 'bg-purple-100 text-purple-800',
  'Entregue': 'bg-green-100 text-green-800',
};

const stats = [
  {
    label: 'Receita Hoje',
    value: 'R$ 3.240,00',
    change: '+12.5%',
    up: true,
    icon: DollarSign,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    label: 'Pedidos Hoje',
    value: '78',
    change: '+8.2%',
    up: true,
    icon: ShoppingCart,
    bgColor: 'bg-primary-50',
    iconColor: 'text-primary',
  },
  {
    label: 'Clientes Ativos',
    value: '1.245',
    change: '+3.1%',
    up: true,
    icon: Users,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Ticket Medio',
    value: 'R$ 41,54',
    change: '-2.4%',
    up: false,
    icon: TrendingUp,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visao geral do seu restaurante</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.up ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.up ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {stat.change}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita Semanal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#FF6B35"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="orders" fill="#FF6B35" radius={[6, 6, 0, 0]} name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tempo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{order.customer}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                    R$ {order.total.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[order.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
