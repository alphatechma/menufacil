import { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  XCircle,
  Calendar,
  Truck,
  Timer,
  Filter,
  X,
  DollarSign,
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
import { useGetDashboardDataQuery, useGetDeliveryPersonsQuery, useGetUnitsQuery, useGetCashRegisterHistoryQuery } from '@/api/adminApi';
import { SettingsPageSkeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedUnit, selectSelectedUnitId } from '@/store/slices/uiSlice';
import { baseApi } from '@/api/baseApi';
import { usePermission } from '@/hooks/usePermission';

const COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Pronto' },
  { value: 'out_for_delivery', label: 'Em Entrega' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const PAYMENT_OPTIONS = [
  { value: '', label: 'Todas as formas' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
];

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};

type RangePreset = '7d' | '30d' | 'month' | 'custom';

function getDateRange(preset: RangePreset, customStart: string, customEnd: string) {
  const now = new Date();
  let since: string;
  let until: string = now.toISOString().split('T')[0];

  switch (preset) {
    case '7d': {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      since = d.toISOString().split('T')[0];
      break;
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(now.getDate() - 29);
      since = d.toISOString().split('T')[0];
      break;
    }
    case 'month': {
      since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    }
    case 'custom':
      since = customStart || until;
      until = customEnd || until;
      break;
  }

  return { since, until };
}

const selectClass = 'px-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

export default function Reports() {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [deliveryPersonFilter, setDeliveryPersonFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const { data: cashHistory = [] } = useGetCashRegisterHistoryQuery();

  const dispatch = useAppDispatch();
  const selectedUnitId = useAppSelector(selectSelectedUnitId);
  const { hasModule } = usePermission();
  const showUnitFilter = hasModule('multi_unit');
  const { data: units } = useGetUnitsQuery(undefined, { skip: !showUnitFilter });
  const originalUnitRef = useRef(selectedUnitId);

  const handleUnitFilterChange = (value: string) => {
    setUnitFilter(value);
    if (value === 'all') {
      dispatch(setSelectedUnit(null));
    } else if (value) {
      dispatch(setSelectedUnit(value));
    } else {
      dispatch(setSelectedUnit(originalUnitRef.current));
    }
    dispatch(baseApi.util.invalidateTags(['Dashboard']));
  };

  // Restore original unit when leaving page
  useEffect(() => {
    const original = originalUnitRef.current;
    return () => {
      if (original) {
        dispatch(setSelectedUnit(original));
      }
    };
  }, [dispatch]);

  const range = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const queryParams = useMemo(() => ({
    ...range,
    ...(statusFilter && { status: statusFilter }),
    ...(paymentFilter && { payment_method: paymentFilter }),
    ...(deliveryPersonFilter && { delivery_person_id: deliveryPersonFilter }),
  }), [range, statusFilter, paymentFilter, deliveryPersonFilter]);

  const { data: dashboard, isLoading, isFetching } = useGetDashboardDataQuery(queryParams, { refetchOnMountOrArgChange: true });
  const { data: allDeliveryPersons = [] } = useGetDeliveryPersonsQuery();

  const activeFiltersCount = [statusFilter, paymentFilter, deliveryPersonFilter, unitFilter].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setPaymentFilter('');
    setDeliveryPersonFilter('');
    setUnitFilter('');
  };

  if (isLoading) return <SettingsPageSkeleton />;

  const totalRevenue = Number(dashboard?.totals?.total_revenue || 0);
  const totalOrders = Number(dashboard?.totals?.total_orders || 0);
  const cancelledOrders = Number(dashboard?.totals?.cancelled_orders || 0);
  const deliveredOrders = Number(dashboard?.totals?.delivered_orders || 0);
  const totalDeliveryFee = Number(dashboard?.totals?.total_delivery_fee || 0);
  const totalDiscount = Number(dashboard?.totals?.total_discount || 0);
  const validOrders = totalOrders - cancelledOrders;
  const avgTicket = validOrders > 0 ? totalRevenue / validOrders : 0;
  const cancellationRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0.0';

  const revenueData = (dashboard?.daily || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: Number(d.revenue),
  }));

  const ordersChartData = (dashboard?.daily || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    pedidos: Number(d.orders),
  }));

  const byStatus = (dashboard?.by_status || []).map((s: any) => ({
    name: STATUS_LABELS[s.status] || s.status,
    count: Number(s.count),
    revenue: Number(s.revenue),
  }));

  const byPayment = (dashboard?.by_payment_method || []).map((p: any) => ({
    name: PAYMENT_LABELS[p.method] || p.method,
    count: Number(p.count),
    revenue: Number(p.revenue),
  }));

  const totalPaymentCount = byPayment.reduce((s: number, p: any) => s + p.count, 0);

  const topProducts = (dashboard?.top_products || []).map((p: any) => ({
    name: p.name,
    quantity: Number(p.quantity),
    revenue: Number(p.revenue),
  }));

  const totalProductQty = topProducts.reduce((s: number, p: any) => s + p.quantity, 0);

  const deliveryPersons = (dashboard?.delivery_persons || []).map((dp: any) => ({
    id: dp.id,
    name: dp.name,
    phone: dp.phone,
    vehicle: dp.vehicle,
    total_deliveries: Number(dp.total_deliveries),
    total_value: Number(dp.total_value),
    avg_delivery_minutes: Number(dp.avg_delivery_minutes) || 0,
  }));

  const totalDPDeliveries = deliveryPersons.reduce((s: number, d: any) => s + d.total_deliveries, 0);

  const stats = [
    { label: 'Receita Total', value: formatPrice(totalRevenue), icon: TrendingUp, bgColor: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600' },
    { label: 'Total de Pedidos', value: String(totalOrders), sub: `${deliveredOrders} entregues`, icon: ShoppingBag, bgColor: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-primary' },
    { label: 'Ticket Médio', value: formatPrice(avgTicket), icon: Receipt, bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600' },
    { label: 'Cancelamentos', value: `${cancellationRate}%`, sub: `${cancelledOrders} pedido(s)`, icon: XCircle, bgColor: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Analise o desempenho do seu restaurante</p>
        </div>
        {isFetching && !isLoading && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Atualizando...
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        {/* Period */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
            <Calendar className="w-4 h-4" />
            Período:
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { value: '7d' as RangePreset, label: '7 dias' },
              { value: '30d' as RangePreset, label: '30 dias' },
              { value: 'month' as RangePreset, label: 'Este mês' },
              { value: 'custom' as RangePreset, label: 'Personalizado' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreset(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  preset === opt.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-1.5 border border-input rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              <span className="text-muted-foreground text-sm">ate</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-1.5 border border-input rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          )}
        </div>

        {/* Additional Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
            <Filter className="w-4 h-4" />
            Filtros:
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={selectClass}>
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select value={deliveryPersonFilter} onChange={(e) => setDeliveryPersonFilter(e.target.value)} className={selectClass}>
              <option value="">Todos os entregadores</option>
              {allDeliveryPersons.filter((dp: any) => dp.is_active).map((dp: any) => (
                <option key={dp.id} value={dp.id}>{dp.name}</option>
              ))}
            </select>

            {showUnitFilter && units && units.length > 1 && (
              <select value={unitFilter} onChange={(e) => handleUnitFilterChange(e.target.value)} className={selectClass}>
                <option value="">Unidade atual</option>
                <option value="all">Todas as unidades</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Active filter badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {statusFilter && (
              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                Status: {STATUS_LABELS[statusFilter]}
                <button onClick={() => setStatusFilter('')} className="ml-1.5 hover:text-blue-900 dark:hover:text-blue-300"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {paymentFilter && (
              <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Pagamento: {PAYMENT_LABELS[paymentFilter]}
                <button onClick={() => setPaymentFilter('')} className="ml-1.5 hover:text-purple-900 dark:hover:text-purple-300"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {deliveryPersonFilter && (
              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                Entregador: {allDeliveryPersons.find((dp: any) => dp.id === deliveryPersonFilter)?.name || '...'}
                <button onClick={() => setDeliveryPersonFilter('')} className="ml-1.5 hover:text-green-900 dark:hover:text-green-300"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {unitFilter && (
              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                Unidade: {unitFilter === 'all' ? 'Todas' : units?.find((u: any) => u.id === unitFilter)?.name || '...'}
                <button onClick={() => handleUnitFilterChange('')} className="ml-1.5 hover:text-orange-900 dark:hover:text-orange-300"><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5">
            <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {'sub' in stat && stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Receita por Dia</h3>
          <div className="h-72">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenueR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatPrice(value), 'Receita']} />
                  <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenueR)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Pedidos por Dia</h3>
          <div className="h-72">
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
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-1">
          <h3 className="text-lg font-semibold text-foreground mb-4">Produtos Mais Vendidos</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p: any, i: number) => {
                const pct = totalProductQty > 0 ? ((p.quantity / totalProductQty) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-sm font-semibold text-foreground ml-2 shrink-0">{formatPrice(p.revenue)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex-1 bg-muted rounded-full h-1.5 mr-3">
                          <div className="bg-primary rounded-full h-1.5" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{p.quantity} un ({pct}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem vendas no período</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Formas de Pagamento</h3>
          {byPayment.length > 0 ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byPayment} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="name">
                      {byPayment.map((_: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value} pedido(s)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {byPayment.map((p: any, i: number) => {
                  const pct = totalPaymentCount > 0 ? ((p.count / totalPaymentCount) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{formatPrice(p.revenue)}</span>
                        <span className="text-muted-foreground ml-2">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Pedidos por Status</h3>
          {byStatus.length > 0 ? (
            <div className="space-y-3">
              {byStatus.map((s: any, i: number) => {
                const pct = totalOrders > 0 ? ((s.count / totalOrders) * 100).toFixed(1) : '0';
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{s.name}</span>
                      <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                    </div>
                    <div className="bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 text-right">{formatPrice(s.revenue)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* Delivery Person Stats */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Entregas por Entregador
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Quantidade, valor, porcentagem e tempo médio de entrega no período</p>
        </div>
        {deliveryPersons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregador</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Veiculo</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregas</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">% do Total</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Total</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveryPersons.map((dp: any) => {
                  const pct = totalDPDeliveries > 0 ? ((dp.total_deliveries / totalDPDeliveries) * 100).toFixed(1) : '0';
                  return (
                    <tr key={dp.id} className="hover:bg-accent transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-foreground">{dp.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPhone(dp.phone)}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{dp.vehicle || '-'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-bold text-foreground">{dp.total_deliveries}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div className="bg-primary rounded-full h-1.5" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-foreground">{formatPrice(dp.total_value)}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                          {dp.avg_delivery_minutes > 0 ? `${dp.avg_delivery_minutes}min` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-muted font-semibold">
                  <td className="px-5 py-3 text-sm text-foreground" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-center text-sm text-foreground">{totalDPDeliveries}</td>
                  <td className="px-5 py-3 text-center text-sm text-foreground">100%</td>
                  <td className="px-5 py-3 text-right text-sm text-foreground">
                    {formatPrice(deliveryPersons.reduce((s: number, d: any) => s + d.total_value, 0))}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma entrega no período selecionado</div>
        )}
      </Card>

      {/* Closing Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Fechamento do Período
        </h3>
        <p className="text-sm text-muted-foreground mb-5">Detalhamento financeiro completo</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Financial */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo Financeiro</h4>
            <div className="space-y-2">
              {[
                { label: 'Receita Bruta (s/ cancelados)', value: formatPrice(totalRevenue), color: 'text-foreground' },
                { label: 'Taxa de Entrega', value: formatPrice(totalDeliveryFee), color: 'text-foreground' },
                { label: 'Descontos', value: `-${formatPrice(totalDiscount)}`, color: 'text-red-600' },
                { label: 'Total de Pedidos', value: String(totalOrders), color: 'text-foreground' },
                { label: 'Pedidos Validos', value: `${validOrders} (${totalOrders > 0 ? ((validOrders / totalOrders) * 100).toFixed(1) : 0}%)`, color: 'text-foreground' },
                { label: 'Entregues', value: `${deliveredOrders} (${totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0}%)`, color: 'text-green-700 dark:text-green-400' },
                { label: 'Cancelados', value: `${cancelledOrders} (${cancellationRate}%)`, color: 'text-red-600' },
                { label: 'Ticket Médio', value: formatPrice(avgTicket), color: 'text-foreground' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Payment */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Por Forma de Pagamento</h4>
            <div className="space-y-2">
              {byPayment.map((p: any, i: number) => {
                const pct = totalPaymentCount > 0 ? ((p.count / totalPaymentCount) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">{p.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{formatPrice(p.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.count} · {pct}%</span>
                    </div>
                  </div>
                );
              })}
              {byPayment.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>}
            </div>
          </div>

          {/* By Status */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Por Status</h4>
            <div className="space-y-2">
              {byStatus.map((s: any, i: number) => {
                const pct = totalOrders > 0 ? ((s.count / totalOrders) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">{s.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{formatPrice(s.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">{s.count} · {pct}%</span>
                    </div>
                  </div>
                );
              })}
              {byStatus.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>}
            </div>
          </div>
        </div>
      </Card>

      {/* Cash Register History */}
      {cashHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Histórico de Caixas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Abertura</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Fechamento</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Operador</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Abertura R$</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Fechamento R$</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Dinheiro</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Crédito</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Débito</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">PIX</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Pedidos</th>
                  <th className="text-right py-2 text-muted-foreground font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {cashHistory.map((reg: any) => {
                  const grandTotal = Number(reg.total_cash) + Number(reg.total_credit) + Number(reg.total_debit) + Number(reg.total_pix);
                  return (
                    <tr key={reg.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 text-xs">{new Date(reg.opened_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 text-xs">{reg.closed_at ? new Date(reg.closed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-2 text-xs">{reg.opened_by_user?.name || '-'}</td>
                      <td className="py-2 text-right text-xs">{formatPrice(reg.opening_balance)}</td>
                      <td className="py-2 text-right text-xs">{formatPrice(reg.closing_balance)}</td>
                      <td className="py-2 text-right text-xs text-green-600">{formatPrice(reg.total_cash)}</td>
                      <td className="py-2 text-right text-xs text-blue-600">{formatPrice(reg.total_credit)}</td>
                      <td className="py-2 text-right text-xs text-indigo-600">{formatPrice(reg.total_debit)}</td>
                      <td className="py-2 text-right text-xs text-teal-600">{formatPrice(reg.total_pix)}</td>
                      <td className="py-2 text-right text-xs font-medium">{reg.orders_count}</td>
                      <td className="py-2 text-right text-xs font-bold text-primary">{formatPrice(grandTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
