import { useParams } from 'react-router-dom';
import {
  Clock,
  Check,
  ChefHat,
  Truck,
  Package,
  XCircle,
  ShoppingCart,
  MapPin,
  CreditCard,
  FileText,
} from 'lucide-react';
import { useGetOrderQuery, useUpdateOrderStatusMutation } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatPrice';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-3 h-3" />,
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-700',
    icon: <Check className="w-3 h-3" />,
  },
  preparing: {
    label: 'Preparando',
    color: 'bg-indigo-100 text-indigo-700',
    icon: <ChefHat className="w-3 h-3" />,
  },
  ready: {
    label: 'Pronto',
    color: 'bg-green-100 text-green-700',
    icon: <Package className="w-3 h-3" />,
  },
  out_for_delivery: {
    label: 'Em Entrega',
    color: 'bg-purple-100 text-purple-700',
    icon: <Truck className="w-3 h-3" />,
  },
  delivered: {
    label: 'Entregue',
    color: 'bg-emerald-100 text-emerald-700',
    icon: <Check className="w-3 h-3" />,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
};

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetOrderQuery(id!);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();

  const handleAdvanceStatus = async () => {
    if (!order) return;
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;
    await updateStatus({ id: order.id, status: nextStatus }).unwrap();
  };

  const handleCancel = async () => {
    if (!order) return;
    await updateStatus({ id: order.id, status: 'cancelled' }).unwrap();
  };

  if (isLoading || !order) return <PageSpinner />;

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const nextStatus = STATUS_FLOW[order.status];

  return (
    <div>
      <PageHeader
        title={`Pedido #${order.number}`}
        backTo="/admin/orders"
        actions={
          <div className="flex gap-2">
            {nextStatus && order.status !== 'cancelled' && (
              <Button
                onClick={handleAdvanceStatus}
                disabled={isUpdating}
                loading={isUpdating}
              >
                {STATUS_CONFIG[nextStatus]?.icon}
                <span className="ml-1">Marcar como {STATUS_CONFIG[nextStatus]?.label}</span>
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Status do Pedido</p>
                <Badge className={config.color}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Data do Pedido</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Itens do Pedido</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="py-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {item.quantity}x {item.product?.name || item.name}
                    </p>
                    {item.variation && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Variacao: {item.variation.name}
                      </p>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Extras: {item.extras.map((e: any) => e.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 ml-4">
                    {formatPrice(item.total || item.price * item.quantity || 0)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal || 0)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de Entrega</span>
                  <span>{formatPrice(order.delivery_fee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatPrice(order.total || 0)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Customer & Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Nome</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.customer?.name || 'Nao informado'}
                </p>
              </div>
              {order.customer?.phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Telefone</p>
                  <p className="text-sm text-gray-700">{order.customer.phone}</p>
                </div>
              )}
              {order.customer?.email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-gray-700">{order.customer.email}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Pagamento</h2>
            </div>
            <div className="space-y-2">
              {order.payment_method && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Metodo</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {order.payment_method}
                  </p>
                </div>
              )}
              {order.payment_status && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <p className="text-sm text-gray-700 capitalize">{order.payment_status}</p>
                </div>
              )}
              {order.change_for && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Troco para</p>
                  <p className="text-sm text-gray-700">{formatPrice(order.change_for)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Address */}
          {order.address && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Endereco</h2>
              </div>
              <p className="text-sm text-gray-700">
                {order.address.street}
                {order.address.number ? `, ${order.address.number}` : ''}
              </p>
              {order.address.complement && (
                <p className="text-sm text-gray-500">{order.address.complement}</p>
              )}
              <p className="text-sm text-gray-500">
                {order.address.neighborhood}
                {order.address.city ? ` - ${order.address.city}` : ''}
              </p>
              {order.address.zip_code && (
                <p className="text-sm text-gray-400">CEP: {order.address.zip_code}</p>
              )}
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Observacoes</h2>
              </div>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </Card>
          )}

          {/* Dates */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historico</h2>
            <div className="space-y-2 text-sm">
              {order.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Criado em</span>
                  <span className="text-gray-700">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Confirmado em</span>
                  <span className="text-gray-700">
                    {new Date(order.confirmed_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {order.preparing_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Em preparo em</span>
                  <span className="text-gray-700">
                    {new Date(order.preparing_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {order.ready_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pronto em</span>
                  <span className="text-gray-700">
                    {new Date(order.ready_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Entregue em</span>
                  <span className="text-gray-700">
                    {new Date(order.delivered_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cancelado em</span>
                  <span className="text-red-600">
                    {new Date(order.cancelled_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
