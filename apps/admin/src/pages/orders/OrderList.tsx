import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  ShoppingCart,
} from 'lucide-react';
import api from '../../services/api';

interface OrderExtra {
  extra_name: string;
  extra_price: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  variation_name: string | null;
  unit_price: number;
  quantity: number;
  extras: OrderExtra[];
}

interface OrderCustomer {
  id: string;
  name: string;
  phone: string;
}

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix';

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: string;
  notes: string | null;
  address_snapshot: string | null;
  created_at: string;
  customer: OrderCustomer;
  items: OrderItem[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu p/ entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  out_for_delivery: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  credit_card: 'Credito',
  debit_card: 'Debito',
  pix: 'Pix',
};

const PAYMENT_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: CreditCard,
  pix: QrCode,
};

type StatusFilter = 'all' | OrderStatus;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Pronto' },
  { value: 'out_for_delivery', label: 'Saiu p/ entrega' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrderList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const {
    data: orders = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(new Date());
  }, [refetch]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = (
    e: React.MouseEvent,
    orderId: string,
    currentStatus: OrderStatus,
  ) => {
    e.stopPropagation();
    const nextStatus = NEXT_STATUS[currentStatus];
    if (nextStatus) {
      statusMutation.mutate({ id: orderId, status: nextStatus });
    }
  };

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getItemsSummary = (items: OrderItem[]) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (items.length <= 2) {
      return items
        .map((item) => `${item.quantity}x ${item.product_name}`)
        .join(', ');
    }
    return `${items[0].quantity}x ${items[0].product_name} +${totalItems - items[0].quantity} itens`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os pedidos do seu restaurante
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          Atualizar
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? orders.length
                  : orders.filter((o) => o.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    statusFilter === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      statusFilter === tab.value
                        ? 'bg-primary-50 text-primary'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por numero do pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm mt-1">
              {statusFilter !== 'all'
                ? `Nenhum pedido com status "${STATUS_LABELS[statusFilter]}"`
                : 'Os pedidos aparecerao aqui quando forem realizados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido #
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Itens
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Pagamento
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Data
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => {
                  const StatusIcon = STATUS_ICONS[order.status];
                  const PaymentIcon = PAYMENT_ICONS[order.payment_method];
                  const nextStatus = NEXT_STATUS[order.status];
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-900">
                          #{order.order_number}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customer.phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden lg:table-cell max-w-xs truncate">
                        {getItemsSummary(order.items)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <PaymentIcon className="w-4 h-4" />
                          <span>{PAYMENT_LABELS[order.payment_method]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 hidden xl:table-cell">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/orders/${order.id}`);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {nextStatus && (
                            <button
                              onClick={(e) =>
                                handleAdvanceStatus(e, order.id, order.status)
                              }
                              disabled={statusMutation.isPending}
                              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                              title={`Avancar para: ${STATUS_LABELS[nextStatus]}`}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <RefreshCw className="w-3 h-3" />
        <span>Atualizacao automatica a cada 30 segundos</span>
      </div>
    </div>
  );
}
