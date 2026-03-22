import { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Activity,
  UserPlus,
  UserMinus,
  Crown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetStatsQuery, useGetAdvancedStatsQuery } from '@/api/superAdminApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type DateRange = 'today' | '7d' | '30d' | '90d';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
];

function getDateRange(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
  }
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="h-9 w-28 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  current,
  change,
  icon: Icon,
  iconBg,
  iconColor,
  format,
}: {
  label: string;
  current: number;
  change: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  format?: (v: number) => string;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            {label}
          </span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover:scale-110`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
          {format ? format(current) : current}
        </p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">vs periodo anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const { from, to } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: stats, isLoading } = useGetStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const { data: advancedStats, isLoading: isLoadingAdvanced } = useGetAdvancedStatsQuery(
    { from, to },
    { refetchOnMountOrArgChange: true },
  );

  if (isLoading) return <DashboardSkeleton />;

  const activeRate = stats?.total_tenants > 0
    ? Math.round((stats.active_tenants / stats.total_tenants) * 100)
    : 0;

  const avgTicketOrder = stats?.total_orders > 0
    ? stats.total_revenue / stats.total_orders
    : 0;

  const avgTicketTenant = stats?.total_tenants > 0
    ? stats.total_revenue / stats.total_tenants
    : 0;

  const cards = [
    {
      label: 'Total Tenants',
      value: stats?.total_tenants ?? 0,
      icon: Building2,
      trend: `${activeRate}% ativos`,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trendUp: activeRate > 50,
    },
    {
      label: 'Tenants Ativos',
      value: stats?.active_tenants ?? 0,
      icon: Activity,
      trend: `de ${stats?.total_tenants ?? 0} total`,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      trendUp: true,
    },
    {
      label: 'Total Usuarios',
      value: stats?.total_users ?? 0,
      icon: Users,
      trend: 'em todos os tenants',
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      trendUp: true,
    },
    {
      label: 'Receita Total',
      value: formatCurrency(stats?.total_revenue ?? 0),
      icon: DollarSign,
      trend: formatCurrency(avgTicketTenant) + '/tenant',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      trendUp: true,
    },
  ];

  const pieData = stats?.tenants_by_plan?.map((item: any) => ({
    name: item.plan_name,
    value: item.count,
  })) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Dashboard
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
            Visao geral da plataforma MenuFacil.
          </p>
        </div>
        {/* Date range selector */}
        <div className="flex items-center gap-1 bg-[hsl(var(--muted))] rounded-lg p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateRange(opt.value)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card
            key={card.label}
            className="group hover:shadow-md transition-all duration-200"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  {card.label}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} transition-transform group-hover:scale-110`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                {card.value}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {card.trendUp && (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                )}
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced KPI Cards */}
      {advancedStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            label="Novos Tenants no Periodo"
            current={advancedStats.newTenants.current}
            change={advancedStats.newTenants.change}
            icon={UserPlus}
            iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
            iconColor="text-indigo-600 dark:text-indigo-400"
          />
          <KpiCard
            label="Churn (Desativados no Periodo)"
            current={advancedStats.churnedTenants.current}
            change={advancedStats.churnedTenants.change}
            icon={UserMinus}
            iconBg="bg-red-500/10 dark:bg-red-500/20"
            iconColor="text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Revenue Trend Chart */}
      {advancedStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tendencia de Receita</CardTitle>
                <CardDescription>Receita por dia no periodo selecionado</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {advancedStats.revenueByDay?.length ?? 0} dias
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {advancedStats.revenueByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={advancedStats.revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      const d = new Date(v + 'T00:00:00');
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      color: 'hsl(var(--foreground))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelFormatter={(label) => {
                      const d = new Date(label + 'T00:00:00');
                      return d.toLocaleDateString('pt-BR');
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum dado de receita no periodo</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tenants por Plano</CardTitle>
                <CardDescription>Distribuicao de tenants entre os planos</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.tenants_by_plan?.length ?? 0} planos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.tenants_by_plan?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.tenants_by_plan} barSize={40}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="plan_name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      color: 'hsl(var(--foreground))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    name="Tenants"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum dado disponivel</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie + Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
            <CardDescription>Metricas consolidadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mini pie chart */}
            {pieData.length > 0 && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            {pieData.length > 0 && (
              <div className="space-y-2">
                {pieData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-[hsl(var(--muted-foreground))]">{item.name}</span>
                    </div>
                    <span className="font-medium text-[hsl(var(--foreground))]">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-[hsl(var(--border))] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <ShoppingBag className="w-4 h-4" />
                  Total de Pedidos
                </div>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {stats?.total_orders ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <DollarSign className="w-4 h-4" />
                  Ticket Medio
                </div>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {formatCurrency(avgTicketOrder)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <Activity className="w-4 h-4" />
                  Taxa de Ativacao
                </div>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {activeRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tenants + Recent Signups */}
      {advancedStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Tenants by Revenue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Top 5 Tenants por Receita</CardTitle>
                  <CardDescription>Maiores receitas no periodo</CardDescription>
                </div>
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              {advancedStats.topTenants?.length > 0 ? (
                <div className="space-y-3">
                  {advancedStats.topTenants.map((tenant: any, i: number) => (
                    <div key={tenant.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-500/15 text-amber-700' :
                          i === 1 ? 'bg-gray-300/30 text-gray-600' :
                          i === 2 ? 'bg-orange-500/15 text-orange-700' :
                          'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{tenant.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{tenant.orders} pedidos</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {formatCurrency(tenant.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados no periodo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Signups */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Cadastros Recentes</CardTitle>
                  <CardDescription>Ultimos 5 tenants cadastrados</CardDescription>
                </div>
                <UserPlus className="w-5 h-5 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              {advancedStats.recentSignups?.length > 0 ? (
                <div className="space-y-3">
                  {advancedStats.recentSignups.map((tenant: any) => (
                    <div key={tenant.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{tenant.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{tenant.plan}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                  <Building2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum cadastro recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
