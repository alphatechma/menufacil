import { useState, useMemo } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  XCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  AlertTriangle,
  ChevronRight,
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
import { useNavigate } from 'react-router-dom';
import { useGetAdvancedStatsQuery, useGetLowStockItemsQuery } from '@/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

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
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DatePreset>('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { data: lowStockItems = [] } = useGetLowStockItemsQuery();

  const range = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data, isLoading } = useGetAdvancedStatsQuery(range, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-72 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="h-7 w-24 mt-3" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
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
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Pedidos',
      value: String(orderCount),
      comparison: data?.orderCountComparison ?? 0,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Ticket Medio',
      value: formatPrice(avgTicket),
      comparison: data?.avgTicketComparison ?? 0,
      icon: TrendingUp,
      bgColor: 'bg-orange-50',
      iconColor: 'text-primary',
    },
    {
      label: 'Taxa de Cancelamento',
      value: `${cancelRate.toFixed(1)}%`,
      comparison: data?.cancelRateComparison ?? 0,
      icon: XCircle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
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
    <div className="space-y-6 animate-fade-in">
      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visao geral do seu restaurante</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  preset === p.key
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-xs text-muted-foreground">ate</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const compValue = kpi.invertComparison ? -kpi.comparison : kpi.comparison;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', kpi.bgColor)}>
                    <kpi.icon className={cn('w-5 h-5', kpi.iconColor)} />
                  </div>
                  <ComparisonBadge value={compValue} />
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue + Orders Trend Chart */}
      <Card>
        <CardHeader className="p-5 pb-0">
          <CardTitle>Receita e Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2, 200 80% 50%))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2, 200 80% 50%))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    yAxisId="revenue"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatPrice(value) : value,
                      name === 'revenue' ? 'Receita' : 'Pedidos',
                    ]}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    yAxisId="orders"
                    type="monotone"
                    dataKey="pedidos"
                    stroke="hsl(var(--chart-2, 200 80% 50%))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem dados no periodo
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Top Products + Orders by Hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products */}
        <Card>
          <CardHeader className="p-5 pb-0">
            <CardTitle>Top 5 Produtos</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Receita
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topProducts.map((product: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {product.count}x
                        </td>
                        <td className="py-3 text-right text-sm font-medium text-foreground">
                          {formatPrice(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados no periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Hour */}
        <Card>
          <CardHeader className="p-5 pb-0">
            <CardTitle>Pedidos por Hora</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-64">
              {hourData.some((h: any) => h.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
                      formatter={(value: number) => [value, 'Pedidos']}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      name="Pedidos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados no periodo
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert Widget */}
      {lowStockItems.length > 0 && (
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/inventory/low-stock')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'itens'} com estoque baixo
                  </p>
                  <p className="text-xs text-gray-500">
                    {lowStockItems.filter((i: any) => Number(i.current_stock) === 0).length > 0
                      ? `${lowStockItems.filter((i: any) => Number(i.current_stock) === 0).length} em falta`
                      : 'Clique para ver detalhes'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
