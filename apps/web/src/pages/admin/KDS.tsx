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
  Clock,
  ChefHat,
  Check,
  X,
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
import { Button } from '@/components/ui/Button';
import { printOrderReceipt } from '@/utils/printOrderReceipt';
import { cn } from '@/utils/cn';

// ─── Types & Constants ──────────────────────────────────────────────────────

interface ColumnConfig {
  id: string;
  title: string;
  statuses: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    title: 'Fila',
    statuses: ['pending', 'confirmed'],
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-500',
  },
  {
    id: 'preparing',
    title: 'Em Preparo',
    statuses: ['preparing'],
    icon: <ChefHat className="w-5 h-5" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-500',
  },
  {
    id: 'ready',
    title: 'Prontos',
    statuses: ['ready'],
    icon: <Check className="w-5 h-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-500',
  },
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

function formatElapsed(dateStr: string): string {
  const now = Date.now();
  const created = parseUTC(dateStr).getTime();
  const diffSec = Math.max(0, Math.floor((now - created) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getElapsedMinutes(dateStr: string): number {
  const now = Date.now();
  const created = parseUTC(dateStr).getTime();
  return Math.max(0, Math.floor((now - created) / 60000));
}

function getTimerHeaderColor(minutes: number) {
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

// ─── Live Timer Hook ────────────────────────────────────────────────────────

function useLiveTimer() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
}

// ─── TMA Bar ────────────────────────────────────────────────────────────────

function useLiveTMA(orders: any[]) {
  return useMemo(() => {
    const activeOrders = orders.filter((o: any) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status),
    );
    if (activeOrders.length === 0) return { avgMinutes: 0, count: 0, oldest: 0 };

    const now = Date.now();
    let totalMinutes = 0;
    let oldest = 0;
    for (const o of activeOrders) {
      const mins = Math.floor((now - parseUTC(o.created_at).getTime()) / 60000);
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
  columnId,
  deliveryPersons,
  onStart,
  onFinish,
  onPause,
  onAssignDelivery,
  isUpdating,
}: {
  order: any;
  columnId: string;
  deliveryPersons: any[];
  onStart?: () => void;
  onFinish?: () => void;
  onPause?: () => void;
  onAssignDelivery?: (orderId: string) => void;
  isUpdating: boolean;
}) {
  const config = ORDER_TYPE_CONFIG[order.order_type] || DEFAULT_TYPE_CONFIG;
  const minutes = order.created_at ? getElapsedMinutes(order.created_at) : 0;
  const elapsed = order.created_at ? formatElapsed(order.created_at) : '00:00:00';
  const timerHeaderColor = getTimerHeaderColor(minutes);
  const title = getCardTitle(order);
  const orderNum = order.order_number || order.id?.slice(0, 6);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', order.id);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  return (
    <div
      draggable={!isUpdating}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm cursor-grab active:cursor-grabbing">
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
            <span className={cn('px-2 py-0.5 rounded-md text-xs font-black font-mono tabular-nums', timerHeaderColor)}>
              {elapsed}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3">
        <table className="w-full">
          <tbody className="divide-y divide-border">
            {order.items?.map((item: any, idx: number) => {
              const name = item.product_name || item.product?.name || item.name || 'Produto';
              const variation = item.variation_name || item.variation?.name;
              const extras = item.extras?.filter((e: any) => e.extra_name || e.name) || [];
              const hasDetails = variation || extras.length > 0 || item.notes;

              return (
                <tr key={idx}>
                  <td className="py-2 pr-3 align-top w-8">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground text-sm font-black">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-2 align-top">
                    <p className="text-sm font-bold text-foreground leading-snug">{name}</p>
                    {hasDetails && (
                      <div className="mt-0.5 space-y-0.5">
                        {variation && (
                          <p className="text-xs text-muted-foreground">{variation}</p>
                        )}
                        {extras.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {extras.map((e: any) => `+ ${e.extra_name || e.name}`).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 italic">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Notes */}
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
      {columnId === 'ready' && order.order_type === 'delivery' && onAssignDelivery && (
        <div className="px-4 pb-3">
          {order.delivery_person_id ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="font-medium">
                {deliveryPersons.find((p: any) => p.id === order.delivery_person_id)?.name || 'Entregador'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => onAssignDelivery(order.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-primary hover:bg-primary-dark text-white transition-colors active:scale-95"
            >
              <Truck className="w-4 h-4" />
              Selecionar Entregador
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {(columnId === 'pending' || columnId === 'preparing') && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {columnId === 'pending' && onStart && (
            <button
              onClick={onStart}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 active:scale-95"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {columnId === 'preparing' && onPause && (
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deliveryModal, setDeliveryModal] = useState<string | null>(null);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');

  // Live timer — re-renders every second for HH:MM:SS
  useLiveTimer();

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const [updateStatus] = useUpdateOrderStatusMutation();
  const [assignDeliveryPerson] = useAssignDeliveryPersonMutation();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useSocket(tenantSlug, {
    'order:new': handleRefetch,
    'order:status-updated': handleRefetch,
  });

  const columnOrders = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const col of COLUMNS) {
      result[col.id] = orders
        .filter((o: any) => col.statuses.includes(o.status))
        .sort(
          (a: any, b: any) =>
            parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime(),
        );
    }
    return result;
  }, [orders]);

  const totalActive = useMemo(() => {
    return orders.filter((o: any) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status),
    ).length;
  }, [orders]);

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

  const handleOpenDeliveryModal = (orderId: string) => {
    setSelectedDeliveryPerson('');
    setDeliveryModal(orderId);
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModal || !selectedDeliveryPerson) return;
    setUpdatingOrderId(deliveryModal);
    try {
      await assignDeliveryPerson({ orderId: deliveryModal, delivery_person_id: selectedDeliveryPerson }).unwrap();
      await updateStatus({ id: deliveryModal, status: 'out_for_delivery' }).unwrap();
    } catch {
      // ignore
    }
    setUpdatingOrderId(null);
    setDeliveryModal(null);
    setSelectedDeliveryPerson('');
  };

  const activeDeliveryPersons = deliveryPersons.filter((p: any) => p.is_active);

  // Drag & drop: map column id → target status
  const COLUMN_TARGET_STATUS: Record<string, string> = {
    pending: 'confirmed',
    preparing: 'preparing',
    ready: 'ready',
  };

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;

    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return;

    // Find which column it's currently in
    const currentColumn = COLUMNS.find((col) => col.statuses.includes(order.status));
    if (!currentColumn || currentColumn.id === targetColumnId) return;

    const targetStatus = COLUMN_TARGET_STATUS[targetColumnId];
    setUpdatingOrderId(orderId);
    try {
      // Moving to preparing: confirm first if pending
      if (targetColumnId === 'preparing' && order.status === 'pending') {
        await updateStatus({ id: orderId, status: 'confirmed' }).unwrap();
        printOrderReceipt(order);
      }
      await updateStatus({ id: orderId, status: targetStatus }).unwrap();
    } catch {
      // ignore
    }
    setUpdatingOrderId(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground">
            {totalActive} Pedido{totalActive !== 1 ? 's' : ''} na Fila
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

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((column) => {
          const colOrders = columnOrders[column.id] || [];
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(column.bgColor, 'rounded-t-2xl px-4 py-3 border-2 border-b-0', column.borderColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={column.color}>{column.icon}</span>
                    <h2 className={cn('font-black text-base', column.color)}>{column.title}</h2>
                  </div>
                  <span className={cn(column.badgeBg, 'text-white text-sm font-black px-3 py-0.5 rounded-full min-w-[28px] text-center')}>
                    {colOrders.length}
                  </span>
                </div>
              </div>

              {/* Column Body */}
              <div
                onDrop={(e) => handleDrop(e, column.id)}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                className={cn(
                  'flex-1 rounded-b-2xl border-2 border-t-0 p-3 space-y-3 min-h-[300px] transition-colors',
                  column.borderColor,
                  `${column.bgColor}/30`,
                  dragOverColumn === column.id && 'ring-2 ring-primary ring-inset bg-primary/5',
                )}>
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm font-bold">Nenhum pedido</p>
                  </div>
                ) : (
                  colOrders.map((order: any) => (
                    <KDSOrderCard
                      key={order.id}
                      order={order}
                      columnId={column.id}
                      deliveryPersons={deliveryPersons}
                      isUpdating={updatingOrderId === order.id}
                      onStart={
                        column.id === 'pending'
                          ? () => handleStart(order.id)
                          : undefined
                      }
                      onFinish={
                        column.id !== 'ready'
                          ? () => handleFinish(order.id)
                          : undefined
                      }
                      onPause={
                        column.id === 'preparing'
                          ? () => handlePause(order.id)
                          : undefined
                      }
                      onAssignDelivery={
                        column.id === 'ready' && order.order_type === 'delivery'
                          ? handleOpenDeliveryModal
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

      {/* Modal: Selecionar Entregador */}
      {deliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeliveryModal(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Selecionar Entregador</h3>
              </div>
              <button
                onClick={() => setDeliveryModal(null)}
                className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o entregador antes de enviar o pedido para entrega.
              </p>

              {activeDeliveryPersons.length === 0 ? (
                <div className="text-center py-6">
                  <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum entregador ativo cadastrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeDeliveryPersons.map((person: any) => (
                    <label
                      key={person.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        selectedDeliveryPerson === person.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80',
                      )}
                    >
                      <input
                        type="radio"
                        name="delivery_person"
                        value={person.id}
                        checked={selectedDeliveryPerson === person.id}
                        onChange={() => setSelectedDeliveryPerson(person.id)}
                        className="sr-only"
                      />
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        selectedDeliveryPerson === person.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
                      )}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {person.phone}
                          {person.vehicle && ` · ${person.vehicle}`}
                        </p>
                      </div>
                      {selectedDeliveryPerson === person.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted">
              <Button variant="outline" onClick={() => setDeliveryModal(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelivery}
                disabled={!selectedDeliveryPerson || updatingOrderId === deliveryModal}
                loading={updatingOrderId === deliveryModal}
              >
                <Truck className="w-4 h-4" />
                <span className="ml-1">Enviar para entrega</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
