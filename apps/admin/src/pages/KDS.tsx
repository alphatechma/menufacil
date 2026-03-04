import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  Clock,
  ChefHat,
  CheckCircle,
  Truck,
  Bell,
  BellOff,
  Maximize,
  Minimize,
  RefreshCw,
  UtensilsCrossed,
  GripVertical,
} from 'lucide-react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderExtra {
  extra_name: string;
}

interface OrderItem {
  product_name: string;
  variation_name: string | null;
  quantity: number;
  extras: OrderExtra[];
}

interface OrderCustomer {
  id: string;
  name: string;
  phone: string;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
  notes: string | null;
  customer: OrderCustomer;
  items: OrderItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatOrderNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}

function getElapsedMinutes(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now.getTime() - created.getTime()) / 60000);
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getTimerColor(minutes: number): string {
  if (minutes < 10) return 'bg-green-100 text-green-700';
  if (minutes <= 20) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

// Allowed transitions: only forward, one step at a time
const ALLOWED_TRANSITIONS: Record<string, string> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OrderCardContent({
  order,
  actionLabel,
  actionIcon: ActionIcon,
  actionColor,
  onAction,
  isUpdating,
  showDragHandle,
}: {
  order: Order;
  actionLabel: string;
  actionIcon: React.ElementType;
  actionColor: string;
  onAction?: () => void;
  isUpdating: boolean;
  showDragHandle?: boolean;
}) {
  const elapsed = getElapsedMinutes(order.created_at);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {showDragHandle && (
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab shrink-0" />
          )}
          <div>
            <span className="text-lg font-bold text-gray-900">
              {formatOrderNumber(order.order_number)}
            </span>
            <p className="text-sm text-gray-500 mt-0.5">{order.customer.name}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getTimerColor(elapsed)}`}
        >
          <Clock className="w-3 h-3" />
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Items */}
      <ul className="space-y-1.5 text-sm text-gray-700">
        {order.items.map((item, idx) => (
          <li key={idx} className="flex flex-col">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-gray-900 shrink-0">
                {item.quantity}x
              </span>
              <div className="flex flex-col">
                <span>{item.product_name}</span>
                {item.variation_name && (
                  <span className="text-xs text-gray-500">
                    {item.variation_name}
                  </span>
                )}
                {item.extras.length > 0 && (
                  <span className="text-xs text-gray-400">
                    + {item.extras.map((e) => e.extra_name).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Notes */}
      {order.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Obs:</span> {order.notes}
        </div>
      )}

      {/* Action button */}
      {onAction && (
        <button
          onClick={onAction}
          disabled={isUpdating}
          className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${actionColor}`}
        >
          <ActionIcon className="w-4 h-4" />
          {isUpdating ? 'Atualizando...' : actionLabel}
        </button>
      )}
    </div>
  );
}

function DraggableOrderCard({
  order,
  actionLabel,
  actionIcon,
  actionColor,
  onAction,
  isUpdating,
}: {
  order: Order;
  actionLabel: string;
  actionIcon: React.ElementType;
  actionColor: string;
  onAction: () => void;
  isUpdating: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? 'opacity-30' : ''}`}
    >
      <OrderCardContent
        order={order}
        actionLabel={actionLabel}
        actionIcon={actionIcon}
        actionColor={actionColor}
        onAction={onAction}
        isUpdating={isUpdating}
        showDragHandle
      />
    </div>
  );
}

function DroppableColumn({
  id,
  children,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors duration-200 ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset rounded-b-xl' : ''
      }`}
    >
      {children}
    </div>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <UtensilsCrossed className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

interface ColumnConfig {
  key: string;
  title: string;
  statuses: string[];
  headerBg: string;
  headerText: string;
  icon: React.ElementType;
  actionLabel: string;
  actionIcon: React.ElementType;
  actionColor: string;
  nextStatus: string;
  emptyMessage: string;
}

const columns: ColumnConfig[] = [
  {
    key: 'confirmed',
    title: 'Novos Pedidos',
    statuses: ['confirmed'],
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    icon: Clock,
    actionLabel: 'Iniciar Preparo',
    actionIcon: ChefHat,
    actionColor: 'bg-blue-600 hover:bg-blue-700',
    nextStatus: 'preparing',
    emptyMessage: 'Nenhum pedido novo',
  },
  {
    key: 'preparing',
    title: 'Em Preparo',
    statuses: ['preparing'],
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    icon: ChefHat,
    actionLabel: 'Marcar Pronto',
    actionIcon: CheckCircle,
    actionColor: 'bg-amber-500 hover:bg-amber-600',
    nextStatus: 'ready',
    emptyMessage: 'Nenhum pedido em preparo',
  },
  {
    key: 'ready',
    title: 'Prontos',
    statuses: ['ready'],
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    icon: CheckCircle,
    actionLabel: 'Saiu p/ Entrega',
    actionIcon: Truck,
    actionColor: 'bg-green-600 hover:bg-green-700',
    nextStatus: 'out_for_delivery',
    emptyMessage: 'Nenhum pedido pronto',
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const prevOrderCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // -----------------------------------------------------------------------
  // Fetch orders
  // -----------------------------------------------------------------------

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get<Order[]>('/orders');
      const relevantOrders = response.data.filter((o) =>
        ['confirmed', 'preparing', 'ready'].includes(o.status),
      );

      // Play sound if new confirmed orders appeared
      const confirmedCount = relevantOrders.filter(
        (o) => o.status === 'confirmed',
      ).length;
      const prevConfirmed = prevOrderCountRef.current;

      if (soundEnabled && confirmedCount > prevConfirmed && prevConfirmed >= 0) {
        playNotification();
      }

      prevOrderCountRef.current = confirmedCount;
      setOrders(relevantOrders);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  // -----------------------------------------------------------------------
  // Update order status
  // -----------------------------------------------------------------------

  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      setUpdatingIds((prev) => new Set(prev).add(orderId));

      try {
        await api.put(`/orders/${orderId}/status`, { status });
        await fetchOrders();
      } catch (err) {
        console.error('Failed to update order status:', err);
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    },
    [fetchOrders],
  );

  // -----------------------------------------------------------------------
  // Drag handlers
  // -----------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const order = event.active.data.current?.order as Order;
    setActiveOrder(order);
  }, []);

  const handleDragOver = useCallback((event: DragEndEvent) => {
    setOverColumnId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveOrder(null);
      setOverColumnId(null);

      const { active, over } = event;
      if (!over) return;

      const order = active.data.current?.order as Order;
      const targetColumnKey = over.id as string;

      // Check if the transition is allowed (only forward, one step)
      const allowedNext = ALLOWED_TRANSITIONS[order.status];
      if (allowedNext !== targetColumnKey) return;

      updateStatus(order.id, targetColumnKey);
    },
    [updateStatus],
  );

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null);
    setOverColumnId(null);
  }, []);

  // -----------------------------------------------------------------------
  // Sound notification
  // -----------------------------------------------------------------------

  const playNotification = useCallback(() => {
    try {
      if (!audioRef.current) {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gain.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, 300);
      }
    } catch {
      // Audio not available
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fullscreen
  // -----------------------------------------------------------------------

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // -----------------------------------------------------------------------
  // Auto-refresh
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Force re-render every 30 seconds to update elapsed timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const getOrdersForColumn = (col: ColumnConfig) =>
    orders.filter((o) => col.statuses.includes(o.status));

  // Find column config for the active order (for DragOverlay)
  const activeOrderColumn = activeOrder
    ? columns.find((c) => c.statuses.includes(activeOrder.status))
    : null;

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-gray-100">
      {/* Top bar */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-orange-400" />
          <h1 className="text-base font-bold tracking-wide">
            KDS - Kitchen Display System
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Last refresh indicator */}
          <span className="hidden sm:inline text-xs text-gray-400">
            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>

          {/* Manual refresh */}
          <button
            onClick={() => fetchOrders()}
            className="p-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled
                ? 'text-orange-400 hover:bg-gray-700'
                : 'text-gray-500 hover:bg-gray-700'
            }`}
            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-hidden p-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {columns.map((col) => {
              const colOrders = getOrdersForColumn(col);
              const ColIcon = col.icon;

              return (
                <div
                  key={col.key}
                  className="flex flex-col rounded-xl overflow-hidden bg-gray-50 border border-gray-200"
                >
                  {/* Column header */}
                  <div
                    className={`${col.headerBg} ${col.headerText} px-4 py-3 flex items-center justify-between shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <ColIcon className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wide">
                        {col.title}
                      </span>
                    </div>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Column body (droppable) */}
                  <DroppableColumn id={col.key} isOver={overColumnId === col.key}>
                    {colOrders.length === 0 ? (
                      <EmptyColumn message={col.emptyMessage} />
                    ) : (
                      colOrders.map((order) => (
                        <DraggableOrderCard
                          key={order.id}
                          order={order}
                          actionLabel={col.actionLabel}
                          actionIcon={col.actionIcon}
                          actionColor={col.actionColor}
                          isUpdating={updatingIds.has(order.id)}
                          onAction={() =>
                            updateStatus(order.id, col.nextStatus)
                          }
                        />
                      ))
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeOrder && activeOrderColumn ? (
              <div className="rotate-2 scale-105 opacity-90">
                <OrderCardContent
                  order={activeOrder}
                  actionLabel={activeOrderColumn.actionLabel}
                  actionIcon={activeOrderColumn.actionIcon}
                  actionColor={activeOrderColumn.actionColor}
                  isUpdating={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
