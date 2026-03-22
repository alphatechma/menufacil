import { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  UserPlus,
  UserMinus,
  CreditCard,
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
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetStatsQuery, useGetAdvancedStatsQuery } from '@/api/superAdminApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
    case 'today': from.setHours(0, 0, 0, 0); break;
    case '7d': from.setDate(from.getDate() - 7); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case '90d': from.setDate(from.getDate() - 90); break;
  }
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6">
            <div className="flex items-center justify-between mb-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-10 rounded-xl" /></div>
            <Skeleton className="h-9 w-28 mb-1" /><Skeleton className="h-3 w-20" />
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    </div>
  );
}

function KpiCard({ label, current, change, icon: Icon, iconBg, iconColor, format }: {
  label: string; current: number; change: number; icon: React.ElementType;
  iconBg: string; iconColor: string; format?: (v: number) => string;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{label}</span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover:scale-110`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{format ? format(current) : current}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
          <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{change > 0 ? '+' : ''}{change}%</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">vs periodo anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const { from, to } = useMemo(() => getDateRange(dateRange), [dateRange]);
  const { data: stats, isLoading } = useGetStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: advancedStats } = useGetAdvancedStatsQuery({ from, to }, { refetchOnMountOrArgChange: true });

  if (isLoading) return <DashboardSkeleton />;

  const activeRate = stats?.total_tenants > 0
    ? Math.round((stats.active_tenants / stats.total_tenants) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Dashboard</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Visao geral da plataforma MenuFacil.</p>
        </div>
        <div className="flex items-center gap-1 bg-[hsl(var(--muted))] rounded-lg p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <Button key={opt.value} variant={dateRange === opt.value ? 'default' : 'ghost'} size="sm" onClick={() => setDateRange(opt.value)} className="text-xs">
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main KPI Cards - Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Estabelecimentos</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 transition-transform group-hover:scale-110">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{stats?.total_tenants ?? 0}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{stats?.active_tenants ?? 0} ativos ({activeRate}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">MRR (Receita Mensal)</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 transition-transform group-hover:scale-110">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{formatCurrency(stats?.mrr ?? 0)}</p>
            <div className="flex items-center gap-1 mt-1">
              <CreditCard className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">baseado nos planos ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Usuarios na Plataforma</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 transition-transform group-hover:scale-110">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{stats?.total_users ?? 0}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">em todos os estabelecimentos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Taxa de Ativacao</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 transition-transform group-hover:scale-110">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{activeRate}%</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{stats?.active_tenants ?? 0} de {stats?.total_tenants ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period KPIs */}
      {advancedStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Novos Estabelecimentos" current={advancedStats.newTenants.current} change={advancedStats.newTenants.change}
            icon={UserPlus} iconBg="bg-indigo-500/10" iconColor="text-indigo-600" />
          <KpiCard label="Churn (Desativados)" current={advancedStats.churnedTenants.current} change={advancedStats.churnedTenants.change}
            icon={UserMinus} iconBg="bg-red-500/10" iconColor="text-red-600" />
        </div>
      )}

      {/* New Tenants Trend + Revenue by Plan */}
      {advancedStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Novos Cadastros no Periodo</CardTitle>
              <CardDescription>Estabelecimentos cadastrados e MRR adicionado</CardDescription>
            </CardHeader>
            <CardContent>
              {advancedStats.mrrByDay?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={advancedStats.mrrByDay}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => [name === 'newTenants' ? `${value} estabelecimentos` : formatCurrency(value), name === 'newTenants' ? 'Novos' : 'MRR Adicionado']}
                      labelFormatter={(l) => new Date(l + 'T00:00:00').toLocaleDateString('pt-BR')} />
                    <Area type="monotone" dataKey="newTenants" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#mrrGradient)" name="newTenants" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-30" /><p className="text-sm">Nenhum cadastro no periodo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por Plano</CardTitle>
              <CardDescription>MRR por plano ativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {advancedStats.planDistribution?.length > 0 ? (<>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={advancedStats.planDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="monthlyRevenue" stroke="none">
                        {advancedStats.planDistribution.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                        formatter={(value: number) => [formatCurrency(value), 'MRR']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {advancedStats.planDistribution.map((item: any, i: number) => (
                    <div key={item.planName} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[hsl(var(--muted-foreground))]">{item.planName}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">{item.tenantCount}</Badge>
                      </div>
                      <span className="font-medium text-[hsl(var(--foreground))]">{formatCurrency(item.monthlyRevenue)}/mes</span>
                    </div>
                  ))}
                </div>
              </>) : (
                <div className="flex flex-col items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                  <DollarSign className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">Nenhum plano ativo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenants by Plan Bar Chart + Recent Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por Plano</CardTitle>
            <CardDescription>Quantidade de estabelecimentos por plano</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.tenants_by_plan?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.tenants_by_plan} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="plan_name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, _: any, props: any) => [`${value} estabelecimentos (${formatCurrency(props.payload.revenue)}/mes)`, 'Tenants']} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Tenants" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-[hsl(var(--muted-foreground))]">
                <Building2 className="w-10 h-10 mb-3 opacity-30" /><p className="text-sm">Nenhum dado disponivel</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Signups */}
        {advancedStats && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-base">Cadastros Recentes</CardTitle><CardDescription>Ultimos estabelecimentos cadastrados</CardDescription></div>
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
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">{tenant.plan}</Badge>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{formatCurrency(tenant.planPrice)}/mes</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-[hsl(var(--muted-foreground))]">
                  <Building2 className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">Nenhum cadastro recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
