import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  Check,
  ChefHat,
  Truck,
  Package,
  XCircle,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/utils/formatPrice';

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

export default function OrderList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();

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
          String(o.number)?.includes(term),
      );
    }

    return result;
  }, [orders, statusFilter, search]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    await updateStatus({ id: orderId, status: nextStatus }).unwrap();
  };

  const handleCancel = async (orderId: string) => {
    await updateStatus({ id: orderId, status: 'cancelled' }).unwrap();
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order: any) => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const nextStatus = STATUS_FLOW[order.status];

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{order.number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.customer?.name || 'Cliente nao informado'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.items?.length || 0} item(s)
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatPrice(order.total || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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
                              variant="outline"
                              onClick={() => handleAdvanceStatus(order.id, order.status)}
                              disabled={isUpdating}
                            >
                              {STATUS_CONFIG[nextStatus]?.icon}
                              <span className="ml-1">{STATUS_CONFIG[nextStatus]?.label}</span>
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
    </div>
  );
}
