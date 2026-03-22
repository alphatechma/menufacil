import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ShoppingBag,
  Activity,
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGetStatsQuery } from '@/api/superAdminApi';

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

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          Dashboard
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
          Visao geral da plataforma MenuFacil.
        </p>
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
    </div>
  );
}
