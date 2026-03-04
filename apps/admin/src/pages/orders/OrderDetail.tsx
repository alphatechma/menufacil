import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  MapPin,
  Phone,
  User,
  FileText,
  ArrowRight,
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

interface AddressSnapshot {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
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

const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

const NEXT_STATUS_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirmar Pedido',
  confirmed: 'Iniciar Preparo',
  preparing: 'Marcar como Pronto',
  ready: 'Saiu para Entrega',
  out_for_delivery: 'Marcar como Entregue',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartao de Credito',
  debit_card: 'Cartao de Debito',
  pix: 'Pix',
};

const PAYMENT_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: CreditCard,
  pix: QrCode,
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  refunded: 'Estornado',
  failed: 'Falhou',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-700',
};

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

const parseAddress = (addressJson: string | null): AddressSnapshot | null => {
  if (!addressJson) return null;
  try {
    return JSON.parse(addressJson);
  } catch {
    return null;
  }
};

const formatAddress = (address: AddressSnapshot): string => {
  const parts: string[] = [];
  if (address.street) {
    let line = address.street;
    if (address.number) line += `, ${address.number}`;
    if (address.complement) line += ` - ${address.complement}`;
    parts.push(line);
  }
  if (address.neighborhood) parts.push(address.neighborhood);
  if (address.city) {
    let cityLine = address.city;
    if (address.state) cityLine += ` - ${address.state}`;
    parts.push(cityLine);
  }
  if (address.zip_code) parts.push(`CEP: ${address.zip_code}`);
  return parts.join(', ');
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleAdvanceStatus = () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (nextStatus) {
      statusMutation.mutate(nextStatus);
    }
  };

  const handleCancel = () => {
    statusMutation.mutate('cancelled');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para pedidos
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-400">
          <Package className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            Pedido nao encontrado
          </p>
          <p className="text-sm text-gray-400 mt-1">
            O pedido que voce procura nao existe ou foi removido
          </p>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status];
  const PaymentIcon = PAYMENT_ICONS[order.payment_method];
  const nextStatus = NEXT_STATUS[order.status];
  const address = parseAddress(order.address_snapshot);
  const currentStatusIndex = STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para pedidos
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{order.order_number}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}
          >
            <StatusIcon className="w-4 h-4" />
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Linha do Tempo
        </h2>
        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-700">Pedido Cancelado</p>
              <p className="text-sm text-red-500">
                Este pedido foi cancelado e nao pode ser mais atualizado
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {STATUS_FLOW.map((status, index) => {
              const Icon = STATUS_ICONS[status];
              const isCompleted = currentStatusIndex >= index;
              const isCurrent = order.status === status;
              return (
                <div key={status} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary-50'
                          : isCompleted
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isCurrent
                            ? 'text-primary'
                            : isCompleted
                              ? 'text-green-600'
                              : 'text-gray-300'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        isCurrent
                          ? 'text-primary'
                          : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {index < STATUS_FLOW.length - 1 && (
                    <div
                      className={`w-8 lg:w-12 h-0.5 mx-1 mt-[-18px] ${
                        currentStatusIndex > index
                          ? 'bg-green-400'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Itens do Pedido
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const extrasTotal = item.extras.reduce(
                  (sum, extra) => sum + extra.extra_price,
                  0,
                );
                const itemTotal =
                  (item.unit_price + extrasTotal) * item.quantity;
                return (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                            {item.quantity}x
                          </span>
                          <p className="font-medium text-gray-900">
                            {item.product_name}
                          </p>
                        </div>
                        {item.variation_name && (
                          <p className="text-sm text-gray-500 mt-1 ml-8">
                            {item.variation_name}
                          </p>
                        )}
                        {item.extras.length > 0 && (
                          <div className="mt-1.5 ml-8 space-y-0.5">
                            {item.extras.map((extra, idx) => (
                              <p
                                key={idx}
                                className="text-xs text-gray-400 flex items-center gap-1"
                              >
                                <span>+</span>
                                <span>{extra.extra_name}</span>
                                <span className="text-gray-500">
                                  ({formatPrice(extra.extra_price)})
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(itemTotal)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatPrice(item.unit_price + extrasTotal)} /un
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 px-5 py-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Taxa de entrega</span>
                <span>
                  {order.delivery_fee > 0
                    ? formatPrice(order.delivery_fee)
                    : 'Gratis'}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Observacoes
                </h2>
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Cliente
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {order.customer.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pagamento
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PaymentIcon className="w-4 h-4" />
                  <span>Metodo</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {PAYMENT_LABELS[order.payment_method]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    PAYMENT_STATUS_COLORS[order.payment_status] ||
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[order.payment_status] ||
                    order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {address && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Endereco de Entrega
                </h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {formatAddress(address)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Acoes
            </h2>
            {nextStatus && !isCancelled && (
              <button
                onClick={handleAdvanceStatus}
                disabled={statusMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {statusMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {NEXT_STATUS_ACTION_LABELS[order.status]}
              </button>
            )}
            {!isCancelled && order.status !== 'delivered' && (
              <button
                onClick={handleCancel}
                disabled={statusMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Pedido
              </button>
            )}
            {(isCancelled || order.status === 'delivered') && (
              <p className="text-sm text-center text-gray-400">
                {isCancelled
                  ? 'Este pedido foi cancelado'
                  : 'Este pedido ja foi entregue'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
