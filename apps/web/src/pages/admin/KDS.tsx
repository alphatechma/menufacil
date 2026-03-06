import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Clock,
  Check,
  ChefHat,
  AlertTriangle,
  User,
  Truck,
  Package,
  UtensilsCrossed,
  Phone,
  Timer,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Play,
  CheckCircle2,
  Volume2,
  VolumeX,
  Gauge,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
  useAssignDeliveryPersonMutation,
  useGetOrderPerformanceStatsQuery,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { PageSpinner } from '@/components/ui/Spinner';

interface ColumnConfig {
  id: string;
  title: string;
  statuses: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  action?: { label: string; nextStatus: string; icon: React.ReactNode; btnClass: string };
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    title: 'Novos Pedidos',
    statuses: ['pending', 'confirmed'],
    icon: <Clock className="w-6 h-6" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-500',
    action: {
      label: 'Iniciar Preparo',
      nextStatus: 'preparing',
      icon: <Play className="w-5 h-5" />,
      btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  },
  {
    id: 'preparing',
    title: 'Em Preparo',
    statuses: ['preparing'],
    icon: <ChefHat className="w-6 h-6" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-500',
    action: {
      label: 'Pronto!',
      nextStatus: 'ready',
      icon: <CheckCircle2 className="w-5 h-5" />,
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  },
  {
    id: 'ready',
    title: 'Prontos p/ Entrega',
    statuses: ['ready'],
    icon: <Check className="w-6 h-6" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-500',
  },
];

/** Parse date ensuring UTC interpretation (server returns UTC without Z suffix) */
function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr);
  return new Date(dateStr + 'Z');
}

function getTimeSince(dateStr: string): { text: string; minutes: number } {
  const now = new Date();
  const created = parseUTC(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return { text: 'Agora', minutes: 0 };
  if (diffMin < 60) return { text: `${diffMin} min`, minutes: diffMin };
  const h = Math.floor(diffMin / 60);
  return { text: `${h}h${diffMin % 60 > 0 ? ` ${diffMin % 60}m` : ''}`, minutes: diffMin };
}

function getUrgencyStyle(minutes: number) {
  if (minutes >= 30) return { ring: 'ring-red-400 ring-2', badge: 'bg-red-100 text-red-700 border-red-200', pulse: true };
  if (minutes >= 15) return { ring: 'ring-amber-300 ring-1', badge: 'bg-amber-50 text-amber-700 border-amber-200', pulse: false };
  return { ring: '', badge: 'bg-gray-50 text-gray-600 border-gray-200', pulse: false };
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Compute live TMA from active orders */
function useLiveTMA(orders: any[]) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const activeOrders = orders.filter((o: any) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status),
    );

    if (activeOrders.length === 0) return { avgMinutes: 0, count: 0, oldest: 0 };

    const now = Date.now();
    let totalMinutes = 0;
    let oldest = 0;

    for (const o of activeOrders) {
      const created = parseUTC(o.created_at).getTime();
      const mins = Math.floor((now - created) / 60000);
      totalMinutes += mins;
      if (mins > oldest) oldest = mins;
    }

    return {
      avgMinutes: Math.round(totalMinutes / activeOrders.length),
      count: activeOrders.length,
      oldest,
    };
  }, [orders]);
}

function getTMAColor(avgMinutes: number): { bg: string; text: string; ring: string; label: string } {
  if (avgMinutes <= 10) return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Excelente' };
  if (avgMinutes <= 20) return { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', label: 'Bom' };
  if (avgMinutes <= 30) return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', label: 'Atencao' };
  return { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300', label: 'Critico' };
}

function TMAPanel({ orders, perfStats }: { orders: any[]; perfStats: any }) {
  const liveTMA = useLiveTMA(orders);
  const tmaStyle = getTMAColor(liveTMA.avgMinutes);
  const historicalTMA = perfStats?.avg_total_time || 0;

  if (liveTMA.count === 0 && !historicalTMA) return null;

  return (
    <div className={`rounded-2xl border-2 ${tmaStyle.ring} ${tmaStyle.bg} p-4 flex items-center gap-5`}>
      {/* Live TMA - Main metric */}
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl ${tmaStyle.bg} ring-2 ${tmaStyle.ring} flex items-center justify-center`}>
          <Gauge className={`w-7 h-7 ${tmaStyle.text}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">TMA Atual</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${tmaStyle.text}`}>
              {liveTMA.count > 0 ? formatMinutes(liveTMA.avgMinutes) : '--'}
            </span>
            {liveTMA.count > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tmaStyle.bg} ${tmaStyle.text} ring-1 ${tmaStyle.ring}`}>
                {tmaStyle.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-12 bg-gray-200" />

      {/* Quick stats */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pedidos Ativos</p>
          <p className="text-xl font-black text-gray-900">{liveTMA.count}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mais Antigo</p>
          <p className={`text-xl font-black ${liveTMA.oldest >= 30 ? 'text-red-600' : liveTMA.oldest >= 15 ? 'text-amber-600' : 'text-gray-900'}`}>
            {liveTMA.count > 0 ? formatMinutes(liveTMA.oldest) : '--'}
          </p>
        </div>
        {historicalTMA > 0 && (
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">TMA 7 dias</p>
            <p className="text-xl font-black text-gray-600">{formatMinutes(historicalTMA)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KDSOrderCard({
  order,
  column,
  deliveryPersons,
  onAction,
  onAssignDelivery,
  isUpdating,
}: {
  order: any;
  column: ColumnConfig;
  deliveryPersons: any[];
  onAction?: () => void;
  onAssignDelivery?: (deliveryPersonId: string | null) => void;
  isUpdating: boolean;
}) {
  const time = order.created_at ? getTimeSince(order.created_at) : { text: '-', minutes: 0 };
  const urgency = getUrgencyStyle(time.minutes);
  const showDelivery = column.id === 'ready';

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${urgency.ring} ${
        urgency.pulse ? 'animate-pulse-subtle' : ''
      } ${column.borderColor}`}
    >
      {/* Card Header - Order number + Time */}
      <div className={`${column.bgColor} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-gray-900">
            #{order.order_number || order.id?.slice(0, 6)}
          </span>
          {order.status === 'pending' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-600 animate-bounce">
              NOVO
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${urgency.badge}`}>
          {time.minutes >= 30 && <AlertTriangle className="w-3.5 h-3.5" />}
          <Timer className="w-3.5 h-3.5" />
          {time.text}
        </div>
      </div>

      {/* Items - The main focus for kitchen */}
      <div className="px-4 py-3">
        <div className="space-y-2">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                {item.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 leading-snug">
                  {item.product_name || item.product?.name || item.name}
                </p>
                {(item.variation_name || item.variation?.name) && (
                  <p className="text-sm text-indigo-600 font-medium">
                    {item.variation_name || item.variation?.name}
                  </p>
                )}
                {item.extras && item.extras.length > 0 && (
                  <p className="text-sm text-amber-600 font-medium">
                    + {item.extras.map((e: any) => e.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes - Very visible for kitchen */}
      {order.notes && (
        <div className="mx-4 mb-3 bg-yellow-100 border-2 border-yellow-300 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-yellow-800">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Customer info - Small, secondary */}
      <div className="px-4 pb-2 flex items-center gap-2 text-xs text-gray-400">
        <User className="w-3.5 h-3.5" />
        <span className="truncate">{order.customer?.name || 'Cliente'}</span>
        {order.customer?.phone && (
          <a
            href={`tel:${order.customer.phone}`}
            className="flex items-center gap-1 text-primary font-medium hover:underline ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" />
            {order.customer.phone}
          </a>
        )}
      </div>

      {/* Delivery person assignment */}
      {showDelivery && onAssignDelivery && (
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              className="flex-1 text-sm rounded-xl border-2 border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              value={order.delivery_person_id || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onAssignDelivery(e.target.value || null);
              }}
            >
              <option value="">Selecionar entregador...</option>
              {deliveryPersons
                .filter((p: any) => p.is_active)
                .map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.vehicle ? `(${p.vehicle})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Action Button - Big and clear */}
      {column.action && onAction && (
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onAction}
            disabled={isUpdating}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50 ${column.action.btnClass}`}
          >
            {column.action.icon}
            {column.action.label}
          </button>
        </div>
      )}
    </div>
  );
}

function PerformancePanel({ stats }: { stats: any }) {
  const [expanded, setExpanded] = useState(false);

  if (!stats || stats.total_completed === 0) return null;

  const metrics = [
    { label: 'Tempo Total', value: formatMinutes(stats.avg_total_time), icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { label: 'Espera', value: formatMinutes(stats.avg_wait_time), icon: Timer, color: 'text-amber-600 bg-amber-50' },
    { label: 'Preparo', value: formatMinutes(stats.avg_prep_time), icon: ChefHat, color: 'text-purple-600 bg-purple-50' },
    { label: 'Entrega', value: formatMinutes(stats.avg_delivery_time), icon: Truck, color: 'text-green-600 bg-green-50' },
    { label: 'Mais Rapido', value: formatMinutes(stats.fastest_order), icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Mais Lento', value: formatMinutes(stats.slowest_order), icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <span className="font-bold text-gray-900">Performance Historica</span>
          <span className="text-xs text-gray-400 font-medium">
            {stats.period_days}d - {stats.total_completed} entregues
          </span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-gray-100 p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center mx-auto mb-2`}>
                  <m.icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-black text-gray-900">{m.value}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {(stats.ranking_fastest?.length > 0 || stats.ranking_slowest?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.ranking_fastest?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-500" /> Top Rapidos
                  </h4>
                  <div className="space-y-1">
                    {stats.ranking_fastest.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50/50 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="font-medium text-gray-700">#{r.order_number}</span>
                        </div>
                        <span className="font-bold text-emerald-600">{formatMinutes(r.total_time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stats.ranking_slowest?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-red-500" /> Mais Lentos
                  </h4>
                  <div className="space-y-1">
                    {stats.ranking_slowest.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-50/50 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="font-medium text-gray-700">#{r.order_number}</span>
                        </div>
                        <span className="font-bold text-red-600">{formatMinutes(r.total_time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KDS() {
  const [, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const { data: perfStats } = useGetOrderPerformanceStatsQuery({ days: 7 });
  const [updateStatus] = useUpdateOrderStatusMutation();
  const [assignDeliveryPerson] = useAssignDeliveryPersonMutation();

  // Update time displays every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useSocket(tenantSlug, {
    'order:new': handleRefetch,
    'order:status-updated': handleRefetch,
  });

  const columnOrders = useMemo(() => {
    const result: Record<string, any[]> = {};
    COLUMNS.forEach((col) => {
      result[col.id] = orders
        .filter((o: any) => col.statuses.includes(o.status))
        .sort(
          (a: any, b: any) =>
            parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime(),
        );
    });
    return result;
  }, [orders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      // For pending orders, first confirm then prepare
      const order = orders.find((o: any) => o.id === orderId);
      if (order?.status === 'pending' && newStatus === 'preparing') {
        await updateStatus({ id: orderId, status: 'confirmed' }).unwrap();
      }
      await updateStatus({ id: orderId, status: newStatus }).unwrap();
    } catch {
      // Status transition failed
    }
    setUpdatingOrderId(null);
  };

  const handleAssignDelivery = async (orderId: string, deliveryPersonId: string | null) => {
    await assignDeliveryPerson({ orderId, delivery_person_id: deliveryPersonId });
  };

  const pendingCount = columnOrders.pending?.length || 0;

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Cozinha</h1>
            <p className="text-sm text-gray-500">
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 animate-pulse">
                  {pendingCount} novo(s)!
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* TMA Panel - Tempo Medio de Atendimento */}
      <div className="mb-5">
        <TMAPanel orders={orders} perfStats={perfStats} />
      </div>

      {/* Performance Panel */}
      <div className="mb-5">
        <PerformancePanel stats={perfStats} />
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {COLUMNS.map((column) => {
          const colOrders = columnOrders[column.id] || [];
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.bgColor} rounded-t-2xl px-5 py-4 border-2 border-b-0 ${column.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${column.color}`}>{column.icon}</div>
                    <h2 className={`font-black text-lg ${column.color}`}>{column.title}</h2>
                  </div>
                  <span className={`${column.badgeBg} text-white text-sm font-black px-3 py-1 rounded-full min-w-[32px] text-center`}>
                    {colOrders.length}
                  </span>
                </div>
              </div>

              {/* Column Body */}
              <div className={`flex-1 ${column.bgColor}/30 rounded-b-2xl border-2 border-t-0 ${column.borderColor} p-3 space-y-3 min-h-[300px]`}>
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                    <Package className="w-14 h-14 mb-3 opacity-50" />
                    <p className="text-sm font-bold text-gray-400">Nenhum pedido</p>
                  </div>
                ) : (
                  colOrders.map((order: any) => (
                    <KDSOrderCard
                      key={order.id}
                      order={order}
                      column={column}
                      deliveryPersons={deliveryPersons}
                      isUpdating={updatingOrderId === order.id}
                      onAction={
                        column.action
                          ? () => handleStatusChange(order.id, column.action!.nextStatus)
                          : undefined
                      }
                      onAssignDelivery={
                        column.id === 'ready'
                          ? (dpId) => handleAssignDelivery(order.id, dpId)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
