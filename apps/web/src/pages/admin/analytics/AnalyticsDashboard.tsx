import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Receipt,
  XCircle,
  UserPlus,
  UserCheck,
  Download,
  Package,
  Users,
  Truck,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsProductsQuery,
  useGetAnalyticsCustomersQuery,
  useGetAnalyticsDeliveryQuery,
} from '@/api/adminApi';

const TABS = [
  { key: 'overview', label: 'Visao Geral', icon: BarChart3 },
  { key: 'products', label: 'Produtos', icon: Package },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'delivery', label: 'Entregas', icon: Truck },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const PIE_COLORS = ['#FF6B35', '#2D3436', '#00B894', '#FDCB6E', '#E17055', '#6C5CE7', '#0984e3', '#e84393'];

const SEGMENT_COLORS: Record<string, string> = {
  champions: '#00B894',
  loyal: '#0984e3',
  at_risk: '#FDCB6E',
  lost: '#E17055',
  new: '#6C5CE7',
};

const SEGMENT_LABELS: Record<string, string> = {
  champions: 'Campeoes',
  loyal: 'Fieis',
  at_risk: 'Em Risco',
  lost: 'Perdidos',
  new: 'Novos',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const handleExport = async (type: string) => {
    const apiBase = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : '/api';
    const url = `${apiBase}/analytics/export/csv?type=${type}&from=${dateRange.from}&to=${dateRange.to}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <PageHeader title="Analytics" />

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">De:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, from: e.target.value }))
            }
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Ate:</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, to: e.target.value }))
            }
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab dateRange={dateRange} onExport={() => handleExport('overview')} />
      )}
      {activeTab === 'products' && (
        <ProductsTab dateRange={dateRange} onExport={() => handleExport('products')} />
      )}
      {activeTab === 'customers' && (
        <CustomersTab dateRange={dateRange} onExport={() => handleExport('customers')} />
      )}
      {activeTab === 'delivery' && (
        <DeliveryTab dateRange={dateRange} onExport={() => handleExport('delivery')} />
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────
interface KpiCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  previous: number;
  change: number;
  format?: 'currency' | 'number' | 'percent';
}

function KpiCard({ title, icon: Icon, current, previous, change, format = 'number' }: KpiCardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const formatValue = (val: number) => {
    if (format === 'currency') return formatCurrency(val);
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString('pt-BR');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {!isNeutral && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
              isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{formatValue(current)}</p>
      <p className="text-xs text-gray-500 mt-1">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        Anterior: {formatValue(previous)}
      </p>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────
function OverviewTab({
  dateRange,
  onExport,
}: {
  dateRange: { from: string; to: string };
  onExport: () => void;
}) {
  const { data, isLoading } = useGetAnalyticsOverviewQuery(dateRange);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const statusData = Object.entries(data.ordersByStatus || {}).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value: value as number,
  }));

  const paymentData = Object.entries(data.ordersByPayment || {}).map(([key, value]) => ({
    name: PAYMENT_LABELS[key] || key,
    value: value as number,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Receita" icon={DollarSign} format="currency" {...data.revenue} />
        <KpiCard title="Pedidos" icon={ShoppingCart} {...data.orderCount} />
        <KpiCard title="Ticket Medio" icon={Receipt} format="currency" {...data.avgTicket} />
        <KpiCard title="Cancelamento" icon={XCircle} format="percent" {...data.cancelRate} />
        <KpiCard title="Novos Clientes" icon={UserPlus} {...data.newCustomers} />
        <KpiCard title="Recorrentes" icon={UserCheck} {...data.returningCustomers} />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Receita por Dia</h3>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Receita']}
                labelFormatter={(label) => {
                  const d = new Date(label + 'T00:00:00');
                  return d.toLocaleDateString('pt-BR');
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B35"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pedidos por Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Pedidos por Forma de Pagamento
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────
function ProductsTab({
  dateRange,
  onExport,
}: {
  dateRange: { from: string; to: string };
  onExport: () => void;
}) {
  const { data, isLoading } = useGetAnalyticsProductsQuery(dateRange);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Produtos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Produto
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Qtd
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Receita
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts?.map((p: any, i: number) => (
                <tr key={p.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-2 font-medium text-gray-900">{p.name}</td>
                  <td className="py-3 px-2 text-gray-600">{p.category}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{p.quantity}</td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Receita por Categoria</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.categoryBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
              <Bar dataKey="revenue" fill="#FF6B35" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profitability Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Lucratividade</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Produto
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Receita
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Custo
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Margem
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Margem %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.profitability?.map((p: any, i: number) => (
                <tr key={p.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-2 font-medium text-gray-900">{p.name}</td>
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatCurrency(p.cost)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(p.margin)}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-2 text-right font-semibold',
                      p.marginPercent < 30 ? 'text-red-600' : 'text-green-600',
                    )}
                  >
                    {p.marginPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Customers Tab ────────────────────────────────────
function CustomersTab({
  dateRange,
  onExport,
}: {
  dateRange: { from: string; to: string };
  onExport: () => void;
}) {
  const { data, isLoading } = useGetAnalyticsCustomersQuery(dateRange);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const segmentData = Object.entries(data.segments || {}).map(([key, value]) => ({
    name: SEGMENT_LABELS[key] || key,
    value: value as number,
    fill: SEGMENT_COLORS[key] || '#999',
  }));

  return (
    <div className="space-y-6">
      {/* Export + Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500">Total Clientes</p>
            <p className="text-xl font-bold text-gray-900">
              {data.totalCustomers?.toLocaleString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Frequencia Media</p>
            <p className="text-xl font-bold text-gray-900">
              {data.avgOrderFrequency} pedidos
            </p>
          </div>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* New vs Returning Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Novos vs Recorrentes
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.newVsReturning}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(label) => {
                  const d = new Date(label + 'T00:00:00');
                  return d.toLocaleDateString('pt-BR');
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="new"
                name="Novos"
                stroke="#6C5CE7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="returning"
                name="Recorrentes"
                stroke="#00B894"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Clientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                    Pedidos
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                    Total Gasto
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers?.map((c: any, i: number) => (
                  <tr key={c.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-2 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-2 text-right text-gray-700">{c.orderCount}</td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900">
                      {formatCurrency(c.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RFM Segments Donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Segmentos RFM</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {segmentData.map((seg) => (
              <div
                key={seg.name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: seg.fill }}
                />
                <div>
                  <p className="text-xs font-medium text-gray-700">{seg.name}</p>
                  <p className="text-xs text-gray-500">{seg.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery Tab ─────────────────────────────────────
function DeliveryTab({
  dateRange,
  onExport,
}: {
  dateRange: { from: string; to: string };
  onExport: () => void;
}) {
  const { data, isLoading } = useGetAnalyticsDeliveryQuery(dateRange);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* Export + Avg Time */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">Tempo Medio de Entrega</p>
          <p className="text-xl font-bold text-gray-900">
            {data.avgDeliveryTime != null ? `${data.avgDeliveryTime} min` : '--'}
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Delivery Person Scoreboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Entregadores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Entregador
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Entregas
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Tempo Medio
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Conclusao
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Comissao
                </th>
              </tr>
            </thead>
            <tbody>
              {data.deliveryPersons?.map((dp: any, i: number) => (
                <tr key={dp.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-2 font-medium text-gray-900">{dp.name}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{dp.deliveries}</td>
                  <td className="py-3 px-2 text-right text-gray-700">
                    {dp.avgTime != null ? `${dp.avgTime} min` : '--'}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-700">
                    {dp.completionRate}%
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(dp.totalCommission)}
                  </td>
                </tr>
              ))}
              {(!data.deliveryPersons || data.deliveryPersons.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                    Nenhuma entrega no periodo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone Performance */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Desempenho por Zona
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Zona
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Entregas
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Tempo Medio
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  Receita
                </th>
              </tr>
            </thead>
            <tbody>
              {data.zoneStats?.map((z: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-2 font-medium text-gray-900">{z.zone}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{z.deliveries}</td>
                  <td className="py-3 px-2 text-right text-gray-700">
                    {z.avgTime != null ? `${z.avgTime} min` : '--'}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(z.revenue)}
                  </td>
                </tr>
              ))}
              {(!data.zoneStats || data.zoneStats.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                    Nenhuma entrega no periodo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="w-8 h-8 text-primary" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <BarChart3 className="w-12 h-12 mb-3" />
      <p className="text-sm">Sem dados para o periodo selecionado</p>
    </div>
  );
}

// ─── Label Maps ───────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Entrega',
  delivered: 'Entregue',
  picked_up: 'Retirado',
  served: 'Servido',
  cancelled: 'Cancelado',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Credito',
  debit_card: 'Debito',
  pix: 'PIX',
};
