import { useState, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  XCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
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
import { useGetAdvancedStatsQuery } from '@/api/api';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';

type DatePreset = 'today' | '7days' | '30days' | '90days' | 'custom';

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string) {
  const now = new Date();
  const to = now.toISOString().split('T')[0];

  if (preset === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }

  const daysMap: Record<string, number> = {
    today: 0,
    '7days': 7,
    '30days': 30,
    '90days': 90,
  };

  const days = daysMap[preset] ?? 7;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return { from: d.toISOString().split('T')[0], to };
}

const presets: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7days', label: '7 dias' },
  { key: '30days', label: '30 dias' },
  { key: '90days', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function ComparisonBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-2 py-0.5',
        isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
      )}
    >
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState<DatePreset>('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data, isLoading } = useGetAdvancedStatsQuery(range, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const revenue = Number(data?.revenue || 0);
  const orderCount = Number(data?.orderCount || 0);
  const avgTicket = Number(data?.avgTicket || 0);
  const cancelRate = Number(data?.cancelRate || 0);

  const kpis = [
    {
      label: 'Receita',
      value: formatPrice(revenue),
      comparison: data?.revenueComparison ?? 0,
      icon: DollarSign,
      bg: 'bg-green-50',
      color: 'text-green-600',
    },
    {
      label: 'Pedidos',
      value: String(orderCount),
      comparison: data?.orderCountComparison ?? 0,
      icon: ShoppingCart,
      bg: 'bg-blue-50',
      color: 'text-blue-600',
    },
    {
      label: 'Ticket Médio',
      value: formatPrice(avgTicket),
      comparison: data?.avgTicketComparison ?? 0,
      icon: TrendingUp,
      bg: 'bg-primary-50',
      color: 'text-primary',
    },
    {
      label: 'Cancelamento',
      value: `${cancelRate.toFixed(1)}%`,
      comparison: data?.cancelRateComparison ?? 0,
      icon: XCircle,
      bg: 'bg-red-50',
      color: 'text-red-500',
      invertComparison: true,
    },
  ];

  const trendData = (data?.ordersPerDay || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: Number(d.revenue),
    pedidos: Number(d.count),
  }));

  const hourData = data?.ordersByHour || [];
  const topProducts = data?.topProducts || [];

  return (
    <div className="flex h-full flex-col p-5 overflow-y-auto animate-page-enter">
      {/* Header + Date Range */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-gray-700 dark:text-zinc-300" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-1">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  preset === p.key
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-900"
              />
              <span className="text-xs text-gray-400">ate</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const compValue = kpi.invertComparison ? -kpi.comparison : kpi.comparison;
          return (
            <div key={kpi.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', kpi.bg)}>
                  <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{kpi.value}</p>
              <div className="mt-1">
                <ComparisonBadge value={compValue} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue + Orders Trend Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-4">Receita e Pedidos</h2>
        <div className="h-64">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="revenue" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <YAxis yAxisId="orders" orientation="right" stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatPrice(value) : value,
                    name === 'revenue' ? 'Receita' : 'Pedidos',
                  ]}
                />
                <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area yAxisId="orders" type="monotone" dataKey="pedidos" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sem dados no periodo</p>
              <p className="text-xs text-gray-400 mt-1">Selecione outro intervalo de datas</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Top Products + Orders by Hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-4">Top 5 Produtos</h2>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{product.count}x</span>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(product.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sem dados no periodo</p>
              <p className="text-xs text-gray-400 mt-1">Selecione outro intervalo de datas</p>
            </div>
          )}
        </div>

        {/* Orders by Hour */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-4">Pedidos por Hora</h2>
          <div className="h-56">
            {hourData.some((h: any) => h.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="hour"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
                    formatter={(value: number) => [value, 'Pedidos']}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sem dados no periodo</p>
              <p className="text-xs text-gray-400 mt-1">Selecione outro intervalo de datas</p>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
