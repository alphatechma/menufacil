import { useState } from 'react';
import { env } from '@/config/env';
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
import { cn } from '@/utils/cn';
import {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsProductsQuery,
  useGetAnalyticsCustomersQuery,
  useGetAnalyticsDeliveryQuery,
} from '@/api/api';

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
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
  credit_card: 'Crédito',
  debit_card: 'Débito',
  pix: 'PIX',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const handleExport = (type: string) => {
    const apiBase = env.apiUrl;
    const url = `${apiBase}/analytics/export/csv?type=${type}&from=${dateRange.from}&to=${dateRange.to}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Analytics</h1>

      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">De:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Ate:</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab dateRange={dateRange} onExport={() => handleExport('overview')} />}
      {activeTab === 'products' && <ProductsTab dateRange={dateRange} onExport={() => handleExport('products')} />}
      {activeTab === 'customers' && <CustomersTab dateRange={dateRange} onExport={() => handleExport('customers')} />}
      {activeTab === 'delivery' && <DeliveryTab dateRange={dateRange} onExport={() => handleExport('delivery')} />}
    </div>
  );
}

// ─── KPI Card ─────
function KpiCard({ title, icon: Icon, current, previous, change, format = 'number' }: {
  title: string; icon: React.ComponentType<{ className?: string }>; current: number; previous: number; change: number; format?: 'currency' | 'number' | 'percent';
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const formatValue = (val: number) => {
    if (format === 'currency') return formatCurrency(val);
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {!isNeutral && (
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900">{formatValue(current)}</p>
      <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      <p className="text-xs text-gray-400">Anterior: {formatValue(previous)}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <BarChart3 className="w-10 h-10 mb-2" />
      <p className="text-sm">Sem dados para o período</p>
    </div>
  );
}

// ─── Overview Tab ─────
function OverviewTab({ dateRange, onExport }: { dateRange: { from: string; to: string }; onExport: () => void }) {
  const { data, isLoading } = useGetAnalyticsOverviewQuery(dateRange);
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const statusData = Object.entries(data.ordersByStatus || {}).map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value: value as number }));
  const paymentData = Object.entries(data.ordersByPayment || {}).map(([key, value]) => ({ name: PAYMENT_LABELS[key] || key, value: value as number }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard title="Receita" icon={DollarSign} format="currency" {...data.revenue} />
        <KpiCard title="Pedidos" icon={ShoppingCart} {...data.orderCount} />
        <KpiCard title="Ticket Médio" icon={Receipt} format="currency" {...data.avgTicket} />
        <KpiCard title="Cancelamento" icon={XCircle} format="percent" {...data.cancelRate} />
        <KpiCard title="Novos Clientes" icon={UserPlus} {...data.newCustomers} />
        <KpiCard title="Recorrentes" icon={UserCheck} {...data.returningCustomers} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Receita por Dia</h3>
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueByDay}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
              <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Pedidos por Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Forma de Pagamento</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Products Tab ─────
function ProductsTab({ dateRange, onExport }: { dateRange: { from: string; to: string }; onExport: () => void }) {
  const { data, isLoading } = useGetAnalyticsProductsQuery(dateRange);
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Top 10 Produtos</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Produto</th>
            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Receita</th>
          </tr></thead>
          <tbody>
            {data.topProducts?.map((p: any, i: number) => (
              <tr key={p.id || i} className="border-b border-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{p.name}</td>
                <td className="py-2 px-2 text-gray-600">{p.category}</td>
                <td className="py-2 px-2 text-right text-gray-700">{p.quantity}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Receita por Categoria</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.categoryBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
              <Bar dataKey="revenue" fill="#FF6B35" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Lucratividade</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Produto</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Receita</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Custo</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Margem</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Margem %</th>
          </tr></thead>
          <tbody>
            {data.profitability?.map((p: any, i: number) => (
              <tr key={p.id || i} className="border-b border-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{p.name}</td>
                <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(p.revenue)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(p.cost)}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900">{formatCurrency(p.margin)}</td>
                <td className={cn('py-2 px-2 text-right font-semibold', p.marginPercent < 30 ? 'text-red-600' : 'text-green-600')}>
                  {p.marginPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Customers Tab ─────
function CustomersTab({ dateRange, onExport }: { dateRange: { from: string; to: string }; onExport: () => void }) {
  const { data, isLoading } = useGetAnalyticsCustomersQuery(dateRange);
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const segmentData = Object.entries(data.segments || {}).map(([key, value]) => ({
    name: SEGMENT_LABELS[key] || key, value: value as number, fill: SEGMENT_COLORS[key] || '#999',
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500">Total Clientes</p>
            <p className="text-xl font-bold text-gray-900">{data.totalCustomers?.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Frequencia Media</p>
            <p className="text-xl font-bold text-gray-900">{data.avgOrderFrequency} pedidos</p>
          </div>
        </div>
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Novos vs Recorrentes</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.newVsReturning}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="new" name="Novos" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="returning" name="Recorrentes" stroke="#00B894" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top 10 Clientes</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Pedidos</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr></thead>
            <tbody>
              {data.topCustomers?.map((c: any, i: number) => (
                <tr key={c.id || i} className="border-b border-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{c.orderCount}</td>
                  <td className="py-2 px-2 text-right font-medium text-gray-900">{formatCurrency(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Segmentos RFM</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {segmentData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery Tab ─────
function DeliveryTab({ dateRange, onExport }: { dateRange: { from: string; to: string }; onExport: () => void }) {
  const { data, isLoading } = useGetAnalyticsDeliveryQuery(dateRange);
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">Tempo Médio de Entrega</p>
          <p className="text-xl font-bold text-gray-900">{data.avgDeliveryTime != null ? `${data.avgDeliveryTime} min` : '--'}</p>
        </div>
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Entregadores</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Entregador</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Entregas</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Tempo Med.</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Conclusao</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Comissao</th>
          </tr></thead>
          <tbody>
            {data.deliveryPersons?.map((dp: any, i: number) => (
              <tr key={dp.id || i} className="border-b border-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{dp.name}</td>
                <td className="py-2 px-2 text-right text-gray-700">{dp.deliveries}</td>
                <td className="py-2 px-2 text-right text-gray-700">{dp.avgTime != null ? `${dp.avgTime} min` : '--'}</td>
                <td className="py-2 px-2 text-right text-gray-700">{dp.completionRate}%</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900">{formatCurrency(dp.totalCommission)}</td>
              </tr>
            ))}
            {(!data.deliveryPersons || data.deliveryPersons.length === 0) && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">Nenhuma entrega</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Desempenho por Zona</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Zona</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Entregas</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Tempo Med.</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Receita</th>
          </tr></thead>
          <tbody>
            {data.zoneStats?.map((z: any, i: number) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{z.zone}</td>
                <td className="py-2 px-2 text-right text-gray-700">{z.deliveries}</td>
                <td className="py-2 px-2 text-right text-gray-700">{z.avgTime != null ? `${z.avgTime} min` : '--'}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900">{formatCurrency(z.revenue)}</td>
              </tr>
            ))}
            {(!data.zoneStats || data.zoneStats.length === 0) && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-sm">Nenhuma entrega</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
