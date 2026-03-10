import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  Check,
  ChefHat,
  Truck,
  Package,
  XCircle,
  Timer,
  X,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-3 h-3" />,
    variant: 'warning',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-700',
    icon: <Check className="w-3 h-3" />,
    variant: 'info',
  },
  preparing: {
    label: 'Preparando',
    color: 'bg-indigo-100 text-indigo-700',
    icon: <ChefHat className="w-3 h-3" />,
    variant: 'info',
  },
  ready: {
    label: 'Pronto',
    color: 'bg-green-100 text-green-700',
    icon: <Package className="w-3 h-3" />,
    variant: 'success',
  },
  out_for_delivery: {
    label: 'Em Entrega',
    color: 'bg-purple-100 text-purple-700',
    icon: <Truck className="w-3 h-3" />,
    variant: 'default',
  },
  delivered: {
    label: 'Entregue',
    color: 'bg-emerald-100 text-emerald-700',
    icon: <Check className="w-3 h-3" />,
    variant: 'success',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
    variant: 'danger',
  },
};

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

const STATUS_FLOW_PICKUP: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

function getStatusFlow(orderType?: string) {
  return !orderType || orderType === 'delivery' ? STATUS_FLOW : STATUS_FLOW_PICKUP;
}

const STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready', label: 'Prontos' },
  { key: 'out_for_delivery', label: 'Em Entrega' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'cancelled', label: 'Cancelados' },
];

function getElapsedTime(order: any): string | null {
  if (order.status === 'delivered' && order.delivered_at && order.created_at) {
    const diff = Math.round((new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / 60000);
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }
  if (order.status === 'cancelled') return null;
  if (!order.created_at) return null;
  const diff = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}min`;
}

function getTimeColor(order: any): string {
  if (order.status === 'delivered') return 'text-green-600';
  if (!order.created_at) return 'text-gray-400';
  const diff = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (diff >= 30) return 'text-red-600';
  if (diff >= 15) return 'text-amber-600';
  return 'text-gray-500';
}

export default function OrderList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [, setTick] = useState(0);
  const [deliveryModal, setDeliveryModal] = useState<{ orderId: string; currentStatus: string } | null>(null);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');

  const navigate = useNavigate();
  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();

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

  const filtered = useMemo(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter((o: any) => o.status === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (o: any) =>
          o.customer?.name?.toLowerCase().includes(term) ||
          String(o.order_number)?.includes(term),
      );
    }

    return result;
  }, [orders, statusFilter, search]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: string, orderType?: string) => {
    const flow = getStatusFlow(orderType);
    const nextStatus = flow[currentStatus];
    if (!nextStatus) return;

    // If pending, navigate to detail to review the order first
    if (currentStatus === 'pending') {
      navigate(`/admin/orders/${orderId}`);
      return;
    }

    // If ready -> out_for_delivery, require delivery person (only for delivery orders)
    if (nextStatus === 'out_for_delivery') {
      setSelectedDeliveryPerson('');
      setDeliveryModal({ orderId, currentStatus });
      return;
    }

    try {
      await updateStatus({ id: orderId, status: nextStatus }).unwrap();
      toast.success('Status do pedido atualizado!');
    } catch {
      toast.error('Erro ao atualizar status do pedido.');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModal || !selectedDeliveryPerson) return;
    try {
      await updateStatus({
        id: deliveryModal.orderId,
        status: 'out_for_delivery',
        delivery_person_id: selectedDeliveryPerson,
      }).unwrap();
      toast.success('Pedido enviado para entrega!');
    } catch {
      toast.error('Erro ao enviar pedido para entrega.');
    }
    setDeliveryModal(null);
    setSelectedDeliveryPerson('');
  };

  const handleCancel = async (orderId: string) => {
    try {
      await updateStatus({ id: orderId, status: 'cancelled' }).unwrap();
      toast.success('Pedido cancelado.');
    } catch {
      toast.error('Erro ao cancelar pedido.');
    }
  };

  const activeDeliveryPersons = deliveryPersons.filter((p: any) => p.is_active);

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
      </div>

      <div className="mb-4">
        <Tabs tabs={STATUS_TABS} activeTab={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por cliente ou numero do pedido..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-12 h-12" />}
          title="Nenhum pedido encontrado"
          description={
            search || statusFilter !== 'all'
              ? 'Tente buscar com outros termos ou altere o filtro.'
              : 'Ainda nao ha pedidos registrados.'
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tempo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((order: any) => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const flow = getStatusFlow(order.order_type);
                  const nextStatus = flow[order.status];

                  return (
                    <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {order.customer?.name || order.customer_name || (order.order_type === 'dine_in' && order.table ? `Mesa ${order.table.number}` : 'Cliente nao informado')}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {order.items?.length || 0} item(s)
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {formatPrice(order.total || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const elapsed = getElapsedTime(order);
                          if (!elapsed) return <span className="text-xs text-muted-foreground">-</span>;
                          const color = getTimeColor(order);
                          return (
                            <span className={`text-xs font-semibold flex items-center gap-1 ${color}`}>
                              <Timer className="w-3 h-3" />
                              {elapsed}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {nextStatus && order.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant={order.status === 'pending' ? 'outline' : 'outline'}
                              onClick={() => handleAdvanceStatus(order.id, order.status, order.order_type)}
                              disabled={isUpdating}
                            >
                              {order.status === 'pending' ? (
                                <>
                                  <ShoppingCart className="w-3 h-3" />
                                  <span className="ml-1">Ver pedido</span>
                                </>
                              ) : (
                                <>
                                  {STATUS_CONFIG[nextStatus]?.icon}
                                  <span className="ml-1">{STATUS_CONFIG[nextStatus]?.label}</span>
                                </>
                              )}
                            </Button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleCancel(order.id)}
                              disabled={isUpdating}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <Link
                    to="/admin/delivery-persons"
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    Cadastrar entregador
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeDeliveryPersons.map((person: any) => (
                    <label
                      key={person.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDeliveryPerson === person.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_person"
                        value={person.id}
                        checked={selectedDeliveryPerson === person.id}
                        onChange={() => setSelectedDeliveryPerson(person.id)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedDeliveryPerson === person.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhone(person.phone)}
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
                disabled={!selectedDeliveryPerson || isUpdating}
                loading={isUpdating}
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
