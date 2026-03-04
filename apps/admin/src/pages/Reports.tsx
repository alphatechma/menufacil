import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Receipt,
  XCircle,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type DateRange = '7d' | '30d' | 'month' | 'custom';

const COLORS = ['#FF6B35', '#FF8F65', '#FFB395', '#FFD7C5', '#E55A2B', '#CC4E24'];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatShortCurrency = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
};

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockData(range: DateRange, customStart: string, customEnd: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);

  switch (range) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      break;
    case '30d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now);
      endDate = customEnd ? new Date(customEnd) : new Date(now);
      break;
  }

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  if (days.length === 0) days.push(new Date(now));

  const rand = seedRandom(days.length * 17 + startDate.getDate());

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const revenueData = days.map((day) => {
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const base = isWeekend ? 3500 : 2200;
    const variation = rand() * 1500 - 500;
    const revenue = Math.max(800, base + variation);
    return {
      date: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dayName: dayNames[dayOfWeek],
      revenue: Math.round(revenue * 100) / 100,
    };
  });

  const ordersData = days.map((day, i) => {
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const base = isWeekend ? 85 : 55;
    const variation = Math.round(rand() * 40 - 15);
    return {
      date: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dayName: dayNames[dayOfWeek],
      pedidos: Math.max(20, base + variation),
    };
  });

  const topProducts = [
    { name: 'X-Burguer Especial', vendas: Math.round(120 + rand() * 80) },
    { name: 'Pizza Margherita', vendas: Math.round(95 + rand() * 60) },
    { name: 'Coca-Cola 600ml', vendas: Math.round(80 + rand() * 70) },
    { name: 'Batata Frita Grande', vendas: Math.round(70 + rand() * 50) },
    { name: 'Acai 500ml', vendas: Math.round(55 + rand() * 45) },
    { name: 'Combo Familia', vendas: Math.round(40 + rand() * 35) },
    { name: 'Suco Natural', vendas: Math.round(35 + rand() * 30) },
    { name: 'Sobremesa do Dia', vendas: Math.round(25 + rand() * 25) },
  ].sort((a, b) => b.vendas - a.vendas);

  const paymentMethods = [
    { name: 'PIX', value: Math.round(38 + rand() * 10) },
    { name: 'Credito', value: Math.round(25 + rand() * 8) },
    { name: 'Debito', value: Math.round(15 + rand() * 8) },
    { name: 'Dinheiro', value: Math.round(10 + rand() * 8) },
  ];

  const orderStatuses = [
    { name: 'Entregue', value: Math.round(65 + rand() * 15) },
    { name: 'Em preparo', value: Math.round(10 + rand() * 8) },
    { name: 'Pendente', value: Math.round(5 + rand() * 5) },
    { name: 'Cancelado', value: Math.round(3 + rand() * 5) },
    { name: 'Saiu p/ entrega', value: Math.round(8 + rand() * 5) },
  ];

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = ordersData.reduce((sum, d) => sum + d.pedidos, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cancelledPct = orderStatuses.find((s) => s.name === 'Cancelado');
  const totalStatusSum = orderStatuses.reduce((sum, s) => sum + s.value, 0);
  const cancellationRate =
    cancelledPct && totalStatusSum > 0
      ? ((cancelledPct.value / totalStatusSum) * 100).toFixed(1)
      : '0.0';

  return {
    revenueData,
    ordersData,
    topProducts,
    paymentMethods,
    orderStatuses,
    totalRevenue,
    totalOrders,
    avgTicket,
    cancellationRate,
  };
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const data = useMemo(
    () => generateMockData(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd],
  );

  const stats = [
    {
      label: 'Receita Total',
      value: formatCurrency(data.totalRevenue),
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total de Pedidos',
      value: data.totalOrders.toLocaleString('pt-BR'),
      icon: ShoppingBag,
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary',
    },
    {
      label: 'Ticket Medio',
      value: formatCurrency(data.avgTicket),
      icon: Receipt,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Taxa de Cancelamento',
      value: `${data.cancellationRate}%`,
      icon: XCircle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
          <p className="text-gray-500 mt-1">Analise o desempenho do seu restaurante</p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">Dados ilustrativos (mock)</span>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            Periodo:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7d' as DateRange, label: 'Ultimos 7 dias' },
              { value: '30d' as DateRange, label: 'Ultimos 30 dias' },
              { value: 'month' as DateRange, label: 'Este mes' },
              { value: 'custom' as DateRange, label: 'Personalizado' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-gray-400 text-sm">ate</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita ao Longo do Tempo</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData}>
                <defs>
                  <linearGradient id="colorRevenueReport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => formatShortCurrency(value)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6B35"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenueReport)"
                  name="Receita"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Per Day */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por Dia</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, 'Pedidos']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Bar dataKey="pedidos" fill="#FF6B35" radius={[6, 6, 0, 0]} name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={120}
                  tick={{ fill: '#4b5563' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, 'Vendas']}
                />
                <Bar dataKey="vendas" fill="#FF6B35" radius={[0, 6, 6, 0]} name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Formas de Pagamento</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.paymentMethods.map((_, index) => (
                    <Cell key={`cell-payment-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value}%`, 'Participacao']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.orderStatuses}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.orderStatuses.map((_, index) => (
                    <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value}%`, 'Participacao']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
