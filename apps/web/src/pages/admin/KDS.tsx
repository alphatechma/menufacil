import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Truck,
  Package,
  UtensilsCrossed,
  Play,
  CheckCircle2,
  Volume2,
  VolumeX,
  Gauge,
  Pause,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
  useAssignDeliveryPersonMutation,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { printOrderReceipt } from '@/utils/printOrderReceipt';
import { cn } from '@/utils/cn';

// ─── Types & Constants ──────────────────────────────────────────────────────

type TabKey = 'queue' | 'preparing' | 'ready';

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'queue', label: 'Fila', statuses: ['pending', 'confirmed'] },
  { key: 'preparing', label: 'Em Preparo', statuses: ['preparing'] },
  { key: 'ready', label: 'Prontos', statuses: ['ready'] },
];

const ORDER_TYPE_CONFIG: Record<string, {
  label: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
}> = {
  dine_in: {
    label: 'Mesa',
    headerBg: 'bg-amber-400',
    headerText: 'text-white',
    badgeBg: 'bg-white/30',
    badgeText: 'text-white',
    icon: <UtensilsCrossed className="w-4 h-4" />,
  },
  pickup: {
    label: 'Retirada',
    headerBg: 'bg-emerald-500',
    headerText: 'text-white',
    badgeBg: 'bg-white/30',
    badgeText: 'text-white',
    icon: <ShoppingBag className="w-4 h-4" />,
  },
  delivery: {
    label: 'Entrega',
    headerBg: 'bg-rose-400',
    headerText: 'text-white',
    badgeBg: 'bg-white/30',
    badgeText: 'text-white',
    icon: <Truck className="w-4 h-4" />,
  },
};

const DEFAULT_TYPE_CONFIG = {
  label: 'Pedido',
  headerBg: 'bg-blue-400',
  headerText: 'text-white',
  badgeBg: 'bg-white/30',
  badgeText: 'text-white',
  icon: <Package className="w-4 h-4" />,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const m = diffMin % 60;
  return { text: `${h}h${m > 0 ? ` ${m}m` : ''}`, minutes: diffMin };
}

function getTimeColor(minutes: number) {
  if (minutes >= 20) return 'text-red-100 bg-red-500/40';
  if (minutes >= 10) return 'text-yellow-100 bg-yellow-500/40';
  return 'text-white/90 bg-white/20';
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTime(dateStr: string): string {
  const d = parseUTC(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getCardTitle(order: any): string {
  if (order.order_type === 'dine_in' && order.table?.number) {
    return `Mesa ${String(order.table.number).padStart(2, '0')}`;
  }
  if (order.order_type === 'delivery') {
    return order.customer?.name || 'Entrega';
  }
  if (order.order_type === 'pickup') {
    return order.customer?.name || 'Retirada';
  }
  return order.customer?.name || 'Cliente';
}

// ─── TMA Panel ──────────────────────────────────────────────────────────────

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

function getTMAColor(avgMinutes: number) {
  if (avgMinutes <= 10) return { text: 'text-emerald-600', label: 'Excelente' };
  if (avgMinutes <= 20) return { text: 'text-blue-600', label: 'Bom' };
  if (avgMinutes <= 30) return { text: 'text-amber-600', label: 'Atencao' };
  return { text: 'text-red-600', label: 'Critico' };
}

function TMABar({ orders }: { orders: any[] }) {
  const tma = useLiveTMA(orders);
  const style = getTMAColor(tma.avgMinutes);

  if (tma.count === 0) return null;

  return (
    <div className="flex items-center gap-6 px-4 py-2.5 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2">
        <Gauge className={cn('w-5 h-5', style.text)} />
        <span className="text-xs font-bold text-muted-foreground uppercase">TMA</span>
        <span className={cn('text-lg font-black', style.text)}>
          {formatMinutes(tma.avgMinutes)}
        </span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-muted', style.text)}>
          {style.label}
        </span>
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{tma.count}</span> ativos
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Mais antigo:
        <span className={cn('font-bold', tma.oldest >= 20 ? 'text-red-600' : tma.oldest >= 10 ? 'text-amber-600' : 'text-foreground')}>
          {formatMinutes(tma.oldest)}
        </span>
      </div>
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────────────────────────────

function KDSOrderCard({
  order,
  tab,
  deliveryPersons,
  onStart,
  onFinish,
  onPause,
  onAssignDelivery,
  isUpdating,
}: {
  order: any;
  tab: TabKey;
  deliveryPersons: any[];
  onStart?: () => void;
  onFinish?: () => void;
  onPause?: () => void;
  onAssignDelivery?: (deliveryPersonId: string | null) => void;
  isUpdating: boolean;
}) {
  const config = ORDER_TYPE_CONFIG[order.order_type] || DEFAULT_TYPE_CONFIG;
  const time = order.created_at ? getTimeSince(order.created_at) : { text: '-', minutes: 0 };
  const timeColor = getTimeColor(time.minutes);
  const title = getCardTitle(order);
  const orderNum = order.order_number || order.id?.slice(0, 6);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Colored Header */}
      <div className={cn('px-4 py-3', config.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className={cn('text-base font-black', config.headerText)}>{title}</span>
          </div>
          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', config.badgeBg, config.badgeText)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={cn('text-sm font-bold', config.headerText)}>
            Pedido #{orderNum}
          </span>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs', config.headerText, 'opacity-80')}>
              {order.created_at ? formatTime(order.created_at) : ''}
            </span>
            <span className={cn('px-2 py-0.5 rounded-md text-xs font-bold', timeColor)}>
              {time.text}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3">
        <div className="space-y-1.5">
          {order.items?.map((item: any, idx: number) => {
            const name = item.product_name || item.product?.name || item.name || 'Produto';
            const variation = item.variation_name || item.variation?.name;
            return (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted-foreground font-medium shrink-0">{item.quantity}x</span>
                  <span className="font-medium text-foreground truncate">{name}</span>
                </div>
                {variation && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{variation}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Extras */}
        {order.items?.some((item: any) => item.extras?.length > 0) && (
          <div className="mt-2 space-y-1">
            {order.items
              .filter((item: any) => item.extras?.length > 0)
              .map((item: any, idx: number) => (
                <p key={idx} className="text-xs text-amber-600 font-medium">
                  + {item.extras.map((e: any) => e.extra_name || e.name).join(', ')}
                </p>
              ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-yellow-800">OBS: {order.notes}</p>
        </div>
      )}

      {/* Delivery address */}
      {order.order_type === 'delivery' && order.address_snapshot && (
        <div className="mx-4 mb-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {order.address_snapshot.street}
            {order.address_snapshot.number ? `, ${order.address_snapshot.number}` : ''}
            {order.address_snapshot.neighborhood ? ` - ${order.address_snapshot.neighborhood}` : ''}
          </span>
        </div>
      )}

      {/* Delivery person assignment */}
      {tab === 'ready' && order.order_type === 'delivery' && onAssignDelivery && (
        <div className="px-4 pb-3">
          <select
            className="w-full text-sm rounded-lg border border-border px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            value={order.delivery_person_id || ''}
            onChange={(e) => onAssignDelivery(e.target.value || null)}
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
      )}

      {/* Action Buttons */}
      {(tab === 'queue' || tab === 'preparing') && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {tab === 'queue' && onStart && (
            <button
              onClick={onStart}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 active:scale-95"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {tab === 'preparing' && onPause && (
            <button
              onClick={onPause}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 active:scale-95"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          )}
          {onFinish && (
            <button
              onClick={onFinish}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors disabled:opacity-50 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main KDS Component ─────────────────────────────────────────────────────

export default function KDS() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
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

  const tabOrders = useMemo(() => {
    const result: Record<TabKey, any[]> = { queue: [], preparing: [], ready: [] };
    for (const tab of TABS) {
      result[tab.key] = orders
        .filter((o: any) => tab.statuses.includes(o.status))
        .sort(
          (a: any, b: any) =>
            parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime(),
        );
    }
    return result;
  }, [orders]);

  const tabCounts = useMemo(() => ({
    queue: tabOrders.queue.length,
    preparing: tabOrders.preparing.length,
    ready: tabOrders.ready.length,
  }), [tabOrders]);

  const totalQueue = tabCounts.queue + tabCounts.preparing;

  const handleStart = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find((o: any) => o.id === orderId);
      if (order?.status === 'pending') {
        await updateStatus({ id: orderId, status: 'confirmed' }).unwrap();
        if (order) printOrderReceipt(order);
      }
      await updateStatus({ id: orderId, status: 'preparing' }).unwrap();
    } catch {
      // ignore
    }
    setUpdatingOrderId(null);
  };

  const handleFinish = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus({ id: orderId, status: 'ready' }).unwrap();
    } catch {
      // ignore
    }
    setUpdatingOrderId(null);
  };

  const handlePause = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus({ id: orderId, status: 'confirmed' }).unwrap();
    } catch {
      // ignore
    }
    setUpdatingOrderId(null);
  };

  const handleAssignDelivery = async (orderId: string, deliveryPersonId: string | null) => {
    await assignDeliveryPerson({ orderId, delivery_person_id: deliveryPersonId });
  };

  const currentOrders = tabOrders[activeTab];

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground">
            {totalQueue} Pedido{totalQueue !== 1 ? 's' : ''} na Fila
          </h1>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              soundEnabled ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground',
            )}
            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TMA Bar */}
      <div className="mb-4">
        <TMABar orders={orders} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-muted p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-black min-w-[20px] text-center',
                activeTab === tab.key
                  ? tab.key === 'queue' ? 'bg-amber-100 text-amber-700' : tab.key === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  : 'bg-muted-foreground/20 text-muted-foreground',
              )}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {currentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Package className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-bold">Nenhum pedido</p>
          <p className="text-sm">
            {activeTab === 'queue' && 'Nenhum pedido novo na fila'}
            {activeTab === 'preparing' && 'Nenhum pedido em preparo'}
            {activeTab === 'ready' && 'Nenhum pedido pronto'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentOrders.map((order: any) => (
            <KDSOrderCard
              key={order.id}
              order={order}
              tab={activeTab}
              deliveryPersons={deliveryPersons}
              isUpdating={updatingOrderId === order.id}
              onStart={activeTab === 'queue' ? () => handleStart(order.id) : undefined}
              onFinish={activeTab !== 'ready' ? () => handleFinish(order.id) : undefined}
              onPause={activeTab === 'preparing' ? () => handlePause(order.id) : undefined}
              onAssignDelivery={
                activeTab === 'ready' && order.order_type === 'delivery'
                  ? (dpId) => handleAssignDelivery(order.id, dpId)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
