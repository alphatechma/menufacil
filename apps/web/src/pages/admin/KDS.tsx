import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Truck,
  Package,
  Volume2,
  VolumeX,
  Gauge,
  MapPin,
  Clock,
  ChefHat,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  List,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr);
  return new Date(dateStr + 'Z');
}

function getElapsedMinutes(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 60000));
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getCardTitle(order: any): string {
  if (order.order_type === 'dine_in' && order.table?.number) return `Mesa ${String(order.table.number).padStart(2, '0')}`;
  return order.customer?.name || `#${order.order_number || order.id?.slice(-4)}`;
}

function getOrderTypeLabel(order: any): string {
  if (order.order_type === 'dine_in') return 'QR Code';
  if (order.order_type === 'delivery') return 'Delivery';
  if (order.order_type === 'pickup') return 'Retirada';
  return 'Pedido';
}

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-300', icon: Clock },
  confirmed: { label: 'Pendente', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-300', icon: Clock },
  preparing: { label: 'Preparando', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', icon: ChefHat },
  ready: { label: 'Pronto', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300', icon: Check },
};

const LATE_CONFIG = { label: 'Preparo atrasado', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400', icon: AlertTriangle };

// ─── Live Timer Hook ────────────────────────────────────────────────────────

function useLiveTimer() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
}

// ─── TMA Bar ────────────────────────────────────────────────────────────────

function TMABar({ orders }: { orders: any[] }) {
  const tma = useMemo(() => {
    const active = orders.filter((o: any) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    if (active.length === 0) return { avg: 0, count: 0, oldest: 0 };
    let total = 0, oldest = 0;
    for (const o of active) {
      const mins = getElapsedMinutes(o.created_at);
      total += mins;
      if (mins > oldest) oldest = mins;
    }
    return { avg: Math.round(total / active.length), count: active.length, oldest };
  }, [orders]);

  const color = tma.avg <= 10 ? 'text-emerald-600' : tma.avg <= 20 ? 'text-blue-600' : tma.avg <= 30 ? 'text-amber-600' : 'text-red-600';

  if (tma.count === 0) return null;

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-card rounded-xl border border-border text-sm">
      <div className="flex items-center gap-2">
        <Gauge className={cn('w-4 h-4', color)} />
        <span className="text-xs font-bold text-muted-foreground">TMA</span>
        <span className={cn('text-base font-black', color)}>{formatMinutes(tma.avg)}</span>
      </div>
      <div className="w-px h-5 bg-border" />
      <span className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{tma.count}</span> ativos</span>
      <span className="text-xs text-muted-foreground">Mais antigo: <span className={cn('font-bold', tma.oldest >= 20 ? 'text-red-600' : 'text-foreground')}>{formatMinutes(tma.oldest)}</span></span>
    </div>
  );
}

// ─── Order Card (Yooga Style) ───────────────────────────────────────────────

function KDSCard({
  order,
  onStart,
  onFinish,
  isUpdating,
  checkedItems,
  onToggleItem,
}: {
  order: any;
  onStart?: () => void;
  onFinish?: () => void;
  isUpdating: boolean;
  checkedItems: Set<number>;
  onToggleItem: (orderId: string, itemIndex: number) => void;
}) {
  const minutes = getElapsedMinutes(order.created_at);
  const isLate = order.status === 'preparing' && minutes >= 30;
  const config = isLate ? LATE_CONFIG : (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending);
  const StatusIcon = config.icon;
  const title = getCardTitle(order);
  const typeLabel = getOrderTypeLabel(order);
  const itemCount = order.items?.length || 0;
  const isPending = order.status === 'pending' || order.status === 'confirmed';
  const isPreparing = order.status === 'preparing';

  return (
    <div className={cn('rounded-2xl border-2 bg-white dark:bg-card overflow-hidden transition-all', config.border)}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-foreground">{title}</h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{typeLabel}</span>
            <span>|</span>
            <span>{itemCount} {itemCount === 1 ? 'Item' : 'Itens'}</span>
            {order.customer?.name && order.order_type !== 'dine_in' && (
              <>
                <span>|</span>
                <span>{order.customer.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status + Timer badges */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold', config.bg, config.color)}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold',
          minutes >= 30 ? 'bg-red-100 text-red-700' : minutes >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600',
        )}>
          <Clock className="w-3 h-3" />
          {formatMinutes(minutes)}
        </span>
      </div>

      {/* Items with checkboxes */}
      <div className="px-4 py-2 space-y-1.5">
        {order.items?.map((item: any, idx: number) => {
          const name = item.product_name || item.product?.name || 'Produto';
          const variation = item.variation_name || item.variation?.name;
          const extras = item.extras?.filter((e: any) => e.extra_name || e.name) || [];
          const isChecked = checkedItems.has(idx);

          return (
            <div key={idx} className="flex items-start gap-2.5">
              {isPreparing && (
                <button
                  onClick={() => onToggleItem(order.id, idx)}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                    isChecked ? 'bg-primary border-primary' : 'border-gray-300 hover:border-primary/50',
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </button>
              )}
              <div className={cn('flex-1', isChecked && 'line-through opacity-50')}>
                <p className="text-sm font-bold text-foreground">{item.quantity}x {name}</p>
                {variation && <p className="text-xs text-muted-foreground ml-4">• {variation}</p>}
                {extras.map((e: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground ml-4">• {e.extra_name || e.name}</p>
                ))}
                {item.notes && <p className="text-xs text-yellow-600 ml-4">Obs: {item.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order notes */}
      {order.notes && (
        <div className="mx-4 mb-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-1.5">
          <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">Obs: {order.notes}</p>
        </div>
      )}

      {/* Address */}
      {order.order_type === 'delivery' && order.address_snapshot && (
        <div className="mx-4 mb-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{order.address_snapshot.street}{order.address_snapshot.number ? `, ${order.address_snapshot.number}` : ''}{order.address_snapshot.neighborhood ? ` - ${order.address_snapshot.neighborhood}` : ''}</span>
        </div>
      )}

      {/* Action footer */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-2">
        <button className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors" title="Detalhes">
          <List className="w-4 h-4" />
        </button>
        {isPending && onStart && (
          <button onClick={onStart} disabled={isUpdating} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-300 transition-colors disabled:opacity-50 active:scale-[0.97]">
            Iniciar preparo
          </button>
        )}
        {isPreparing && onFinish && (
          <button onClick={onFinish} disabled={isUpdating} className={cn(
            'flex-1 py-2.5 rounded-xl font-bold text-sm border transition-colors disabled:opacity-50 active:scale-[0.97]',
            isLate
              ? 'bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-yellow-200'
              : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
            isLate && 'flex items-center justify-center gap-1.5',
          )}>
            {isLate && <AlertTriangle className="w-4 h-4" />}
            Finalizar pedido
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main KDS ───────────────────────────────────────────────────────────────

export default function KDS() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'finished' | 'cancelled'>('active');
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [deliveryModal, setDeliveryModal] = useState<string | null>(null);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');

  useLiveTimer();

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const [updateStatus] = useUpdateOrderStatusMutation();
  const [assignDeliveryPerson] = useAssignDeliveryPersonMutation();

  const handleRefetch = useCallback(() => { refetch(); }, [refetch]);
  useSocket(tenantSlug, { 'order:new': handleRefetch, 'order:status-updated': handleRefetch });

  const activeOrders = useMemo(() =>
    orders.filter((o: any) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
      .sort((a: any, b: any) => parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime()),
  [orders]);

  const finishedOrders = useMemo(() =>
    orders.filter((o: any) => ['delivered', 'picked_up', 'served', 'out_for_delivery'].includes(o.status))
      .sort((a: any, b: any) => parseUTC(b.created_at).getTime() - parseUTC(a.created_at).getTime())
      .slice(0, 20),
  [orders]);

  const cancelledOrders = useMemo(() =>
    orders.filter((o: any) => o.status === 'cancelled')
      .sort((a: any, b: any) => parseUTC(b.created_at).getTime() - parseUTC(a.created_at).getTime())
      .slice(0, 20),
  [orders]);

  const handleStart = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find((o: any) => o.id === orderId);
      if (order?.status === 'pending') {
        await updateStatus({ id: orderId, status: 'confirmed' }).unwrap();
        if (order) printOrderReceipt(order);
      }
      await updateStatus({ id: orderId, status: 'preparing' }).unwrap();
    } catch { /* */ }
    setUpdatingOrderId(null);
  };

  const handleFinish = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus({ id: orderId, status: 'ready' }).unwrap();
      setCheckedItems((prev) => { const next = { ...prev }; delete next[orderId]; return next; });
    } catch { /* */ }
    setUpdatingOrderId(null);
  };

  const toggleItem = (orderId: string, itemIndex: number) => {
    setCheckedItems((prev) => {
      const current = prev[orderId] || new Set<number>();
      const next = new Set(current);
      if (next.has(itemIndex)) next.delete(itemIndex);
      else next.add(itemIndex);
      return { ...prev, [orderId]: next };
    });
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModal || !selectedDeliveryPerson) return;
    setUpdatingOrderId(deliveryModal);
    try {
      await assignDeliveryPerson({ orderId: deliveryModal, delivery_person_id: selectedDeliveryPerson }).unwrap();
      await updateStatus({ id: deliveryModal, status: 'out_for_delivery' }).unwrap();
    } catch { /* */ }
    setUpdatingOrderId(null); setDeliveryModal(null); setSelectedDeliveryPerson('');
  };

  const activeDeliveryPersons = deliveryPersons.filter((p: any) => p.is_active);
  const displayOrders = activeTab === 'active' ? activeOrders : activeTab === 'finished' ? finishedOrders : cancelledOrders;

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-foreground" />
          <h1 className="text-xl font-black text-foreground">Cozinha</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors', soundEnabled ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Alerta de pedidos
          </button>
        </div>
      </div>

      {/* TMA */}
      <div className="mb-4">
        <TMABar orders={orders} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        <button onClick={() => setActiveTab('active')} className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors', activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
          Pedidos ({activeOrders.length})
        </button>
        <button onClick={() => setActiveTab('finished')} className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors', activeTab === 'finished' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
          Finalizados ({finishedOrders.length})
        </button>
        <button onClick={() => setActiveTab('cancelled')} className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors', activeTab === 'cancelled' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
          Cancelados ({cancelledOrders.length})
        </button>
      </div>

      {/* Order Grid */}
      {displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="w-16 h-16 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum pedido</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayOrders.map((order: any) => (
            <KDSCard
              key={order.id}
              order={order}
              isUpdating={updatingOrderId === order.id}
              checkedItems={checkedItems[order.id] || new Set()}
              onToggleItem={toggleItem}
              onStart={['pending', 'confirmed'].includes(order.status) ? () => handleStart(order.id) : undefined}
              onFinish={order.status === 'preparing' ? () => handleFinish(order.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Delivery Person Modal */}
      {deliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeliveryModal(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Selecionar Entregador</h3>
              </div>
              <button onClick={() => setDeliveryModal(null)} className="p-1 hover:bg-muted/50 rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6">
              {activeDeliveryPersons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum entregador ativo.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {activeDeliveryPersons.map((p: any) => (
                    <label key={p.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all', selectedDeliveryPerson === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                      <input type="radio" name="delivery" value={p.id} checked={selectedDeliveryPerson === p.id} onChange={() => setSelectedDeliveryPerson(p.id)} className="sr-only" />
                      <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', selectedDeliveryPerson === p.id ? 'border-primary bg-primary' : 'border-gray-300')}>
                        {selectedDeliveryPerson === p.id && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <button onClick={handleConfirmDelivery} disabled={!selectedDeliveryPerson || updatingOrderId === deliveryModal} className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50">
                Confirmar Entregador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
