import { useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Clock, Timer, Check } from 'lucide-react';
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { PageSpinner } from '@/components/ui/Spinner';

interface Column {
  id: string;
  title: string;
  statuses: string[];
  icon: React.ReactNode;
  headerColor: string;
}

const COLUMNS: Column[] = [
  {
    id: 'pending',
    title: 'Pendentes',
    statuses: ['pending', 'confirmed'],
    icon: <Clock className="w-5 h-5" />,
    headerColor: 'bg-yellow-500',
  },
  {
    id: 'preparing',
    title: 'Em Preparo',
    statuses: ['preparing'],
    icon: <Timer className="w-5 h-5" />,
    headerColor: 'bg-indigo-500',
  },
  {
    id: 'ready',
    title: 'Prontos',
    statuses: ['ready'],
    icon: <Check className="w-5 h-5" />,
    headerColor: 'bg-green-500',
  },
];

const COLUMN_STATUS_MAP: Record<string, string> = {
  pending: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
};

function getTimeSince(dateStr: string): string {
  const now = new Date();
  const created = new Date(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h ${diffMin % 60}min`;
}

function OrderCard({ order, isDragging }: { order: any; isDragging?: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${
        isDragging ? 'shadow-lg ring-2 ring-primary opacity-90' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-gray-900">#{order.number}</span>
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {order.created_at ? getTimeSince(order.created_at) : '-'}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        {order.items?.map((item: any, idx: number) => (
          <div key={idx} className="text-sm text-gray-700">
            <span className="font-medium">{item.quantity}x</span>{' '}
            {item.product?.name || item.name}
            {item.variation && (
              <span className="text-gray-400"> ({item.variation.name})</span>
            )}
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-700">
          {order.notes}
        </div>
      )}

      {order.customer?.name && (
        <div className="mt-2 text-xs text-gray-400">
          {order.customer.name}
        </div>
      )}
    </div>
  );
}

function SortableCard({ order }: { order: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard order={order} />
    </div>
  );
}

function KDSColumn({
  column,
  orders,
}: {
  column: Column;
  orders: any[];
}) {
  return (
    <div className="flex flex-col bg-gray-50 rounded-2xl overflow-hidden min-h-[calc(100vh-200px)]">
      <div className={`${column.headerColor} px-4 py-3 flex items-center gap-2 text-white`}>
        {column.icon}
        <h2 className="font-semibold text-lg">{column.title}</h2>
        <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium">
          {orders.length}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <SortableContext
          items={orders.map((o: any) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map((order: any) => (
            <SortableCard key={order.id} order={order} />
          ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhum pedido
          </div>
        )}
      </div>
    </div>
  );
}

export default function KDS() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const [updateStatus] = useUpdateOrderStatusMutation();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useSocket(tenantSlug, {
    'order:new': handleRefetch,
    'order:status-updated': handleRefetch,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const columnOrders = useMemo(() => {
    const result: Record<string, any[]> = {};
    COLUMNS.forEach((col) => {
      result[col.id] = orders.filter((o: any) => col.statuses.includes(o.status));
    });
    return result;
  }, [orders]);

  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return orders.find((o: any) => o.id === activeId) || null;
  }, [activeId, orders]);

  const findColumnForOrder = (orderId: string): string | null => {
    for (const col of COLUMNS) {
      if (columnOrders[col.id]?.some((o: any) => o.id === orderId)) {
        return col.id;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeOrderId = String(active.id);
    const sourceColumn = findColumnForOrder(activeOrderId);

    // Determine target column: could be dropping on another card or on the column droppable
    let targetColumn: string | null = null;

    // Check if 'over' is a column id
    if (COLUMNS.some((c) => c.id === String(over.id))) {
      targetColumn = String(over.id);
    } else {
      // It's another order card - find which column it belongs to
      targetColumn = findColumnForOrder(String(over.id));
    }

    if (!targetColumn || sourceColumn === targetColumn) return;

    const newStatus = COLUMN_STATUS_MAP[targetColumn];
    if (!newStatus) return;

    await updateStatus({ id: activeOrderId, status: newStatus }).unwrap();
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cozinha (KDS)</h1>
        <div className="text-sm text-gray-500">
          {orders.length} pedido(s) ativos
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((column) => (
            <KDSColumn
              key={column.id}
              column={column}
              orders={columnOrders[column.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? <OrderCard order={activeOrder} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
