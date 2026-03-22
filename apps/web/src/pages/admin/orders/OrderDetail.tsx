import { useState } from 'react';
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
  Phone,
  User,
  X,
  Printer,
  UtensilsCrossed,
} from 'lucide-react';
import {
  useGetOrderQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
  useAssignDeliveryPersonMutation,
} from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailPageSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/utils/formatPrice';
import { printOrderReceipt } from '@/utils/printOrderReceipt';
import { formatPhone } from '@/utils/formatPhone';
import { useNotify } from '@/hooks/useNotify';

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

const STATUS_FLOW_PICKUP: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  dine_in: 'Consumo no Local',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao de Credito',
  debit_card: 'Cartao de Debito',
  cash: 'Dinheiro',
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-600' },
  paid: { label: 'Pago', color: 'text-green-600' },
  failed: { label: 'Falhou', color: 'text-red-600' },
  refunded: { label: 'Reembolsado', color: 'text-gray-600' },
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetOrderQuery(id!);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const [assignDeliveryPerson] = useAssignDeliveryPersonMutation();

  const notify = useNotify();
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');

  const isDeliveryOrder = !order?.order_type || order?.order_type === 'delivery';
  const statusFlow = isDeliveryOrder ? STATUS_FLOW : STATUS_FLOW_PICKUP;

  const handleAdvanceStatus = async () => {
    if (!order) return;
    const nextStatus = statusFlow[order.status];
    if (!nextStatus) return;

    // If ready -> out_for_delivery, open delivery person modal (only for delivery orders)
    if (nextStatus === 'out_for_delivery') {
      setSelectedDeliveryPerson(order.delivery_person_id || '');
      setDeliveryModal(true);
      return;
    }

    await updateStatus({ id: order.id, status: nextStatus }).unwrap();
    notify.success(`Status atualizado para ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`);

    // Auto-print receipt when confirming order (pending -> confirmed)
    if (order.status === 'pending' && nextStatus === 'confirmed') {
      printOrderReceipt(order);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order || !selectedDeliveryPerson) return;
    await updateStatus({
      id: order.id,
      status: 'out_for_delivery',
      delivery_person_id: selectedDeliveryPerson,
    }).unwrap();
    notify.success('Pedido enviado para entrega');
    setDeliveryModal(false);
    setSelectedDeliveryPerson('');
  };

  const handleCancel = async () => {
    if (!order) return;
    await updateStatus({ id: order.id, status: 'cancelled' }).unwrap();
    notify.success('Pedido cancelado');
  };

  if (isLoading || !order) return <DetailPageSkeleton />;

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const nextStatus = statusFlow[order.status];
  const activeDeliveryPersons = deliveryPersons.filter((p: any) => p.is_active);

  return (
    <div>
      <PageHeader
        title={`Pedido #${order.order_number || order.id?.slice(0, 8)}`}
        backTo="/admin/orders"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => printOrderReceipt(order)}
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            {nextStatus && order.status !== 'cancelled' && (
              <Button
                onClick={handleAdvanceStatus}
                disabled={isUpdating}
                loading={isUpdating}
              >
                {STATUS_CONFIG[nextStatus]?.icon}
                <span className="ml-1">
                  Marcar como {STATUS_CONFIG[nextStatus]?.label}
                </span>
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button variant="danger" onClick={handleCancel} disabled={isUpdating}>
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status do Pedido</p>
                <Badge className={config.color}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
              </div>
              {order.order_type && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                  <Badge className="bg-muted text-foreground">
                    {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                  </Badge>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Data do Pedido</p>
                <p className="text-sm font-medium text-foreground">
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
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Itens do Pedido
              </h2>
            </div>
            <div className="divide-y divide-border">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="py-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {item.quantity}x{' '}
                      {item.product_name || item.product?.name || item.name}
                    </p>
                    {(item.variation_name || item.variation?.name) && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Variacao: {item.variation_name || item.variation?.name}
                      </p>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Extras:{' '}
                        {item.extras
                          .map(
                            (e: any) =>
                              `${e.extra_name || e.name} (+${formatPrice(Number(e.extra_price || e.price || 0))})`,
                          )
                          .join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground ml-4">
                    {formatPrice(
                      (() => {
                        const unitPrice = Number(item.unit_price || item.price || 0);
                        const extrasTotal = (item.extras || []).reduce(
                          (s: number, e: any) => s + Number(e.extra_price || e.price || 0),
                          0,
                        );
                        return (unitPrice + extrasTotal) * (item.quantity || 1);
                      })(),
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal) || 0)}</span>
              </div>
              {Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de Entrega</span>
                  <span>{formatPrice(Number(order.delivery_fee))}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-{formatPrice(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatPrice(Number(order.total) || 0)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Cliente</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Nome
                </p>
                <p className="text-sm font-medium text-foreground">
                  {order.customer?.name || 'Nao informado'}
                </p>
              </div>
              {order.customer?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Telefone
                  </p>
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="text-sm text-primary font-medium flex items-center gap-1.5 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhone(order.customer.phone)}
                  </a>
                </div>
              )}
              {order.customer?.email && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-sm text-foreground">{order.customer.email}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Table Info (dine-in) */}
          {order.order_type === 'dine_in' && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Mesa</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Numero da Mesa
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Mesa {order.table?.number || '-'}
                    {order.table?.label && ` (${order.table.label})`}
                  </p>
                </div>
                {order.customer_name && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Nome na Comanda
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {order.customer_name}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Payment */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Pagamento</h2>
            </div>
            <div className="space-y-2">
              {order.payment_method && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Metodo
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                  </p>
                </div>
              )}
              {order.payment_status && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      PAYMENT_STATUS_LABELS[order.payment_status]?.color ||
                      'text-gray-700'
                    }`}
                  >
                    {PAYMENT_STATUS_LABELS[order.payment_status]?.label ||
                      order.payment_status}
                  </p>
                </div>
              )}
              {Number(order.change_for) > 0 && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-600 uppercase tracking-wider font-medium mb-1">
                    Troco
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente paga com</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(Number(order.change_for))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Total do pedido</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(Number(order.total))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-amber-200 dark:border-amber-800">
                    <span className="font-semibold text-amber-700">Troco</span>
                    <span className="font-bold text-amber-700">
                      {formatPrice(Number(order.change_for) - Number(order.total))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Address */}
          {order.address_snapshot && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Endereco</h2>
              </div>
              <p className="text-sm text-foreground">
                {order.address_snapshot.street}
                {order.address_snapshot.number
                  ? `, ${order.address_snapshot.number}`
                  : ''}
              </p>
              {order.address_snapshot.complement && (
                <p className="text-sm text-muted-foreground">
                  {order.address_snapshot.complement}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {order.address_snapshot.neighborhood}
                {order.address_snapshot.city
                  ? ` - ${order.address_snapshot.city}`
                  : ''}
              </p>
              {(order.address_snapshot.zip_code || order.address_snapshot.zipcode) && (
                <p className="text-sm text-muted-foreground">
                  CEP: {order.address_snapshot.zip_code || order.address_snapshot.zipcode}
                </p>
              )}
            </Card>
          )}

          {!order.address_snapshot && order.address && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Endereco</h2>
              </div>
              <p className="text-sm text-foreground">
                {order.address.street}
                {order.address.number ? `, ${order.address.number}` : ''}
              </p>
              {order.address.complement && (
                <p className="text-sm text-muted-foreground">{order.address.complement}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {order.address.neighborhood}
                {order.address.city ? ` - ${order.address.city}` : ''}
              </p>
            </Card>
          )}

          {/* Delivery Person - only for delivery orders */}
          {isDeliveryOrder && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Entregador</h2>
              </div>

              {activeDeliveryPersons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum entregador cadastrado.
                </p>
              ) : (
                <>
                  <select
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    value={order.delivery_person_id || ''}
                    onChange={async (e) => {
                      const value = e.target.value || null;
                      await assignDeliveryPerson({
                        orderId: order.id,
                        delivery_person_id: value,
                      });
                    }}
                  >
                    <option value="">Sem entregador</option>
                    {activeDeliveryPersons.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.vehicle ? `(${p.vehicle})` : ''}
                      </option>
                    ))}
                  </select>
                  {order.delivery_person && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <a
                        href={`tel:${order.delivery_person.phone}`}
                        className="text-primary hover:underline"
                      >
                        {formatPhone(order.delivery_person.phone)}
                      </a>
                      {order.delivery_person.vehicle && (
                        <span className="text-muted-foreground">
                          | {order.delivery_person.vehicle}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  Observacoes
                </h2>
              </div>
              <p className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg p-3">
                {order.notes}
              </p>
            </Card>
          )}

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Historico
            </h2>
            <div className="space-y-3">
              {[
                { key: 'created_at', label: 'Criado' },
                { key: 'confirmed_at', label: 'Confirmado' },
                { key: 'preparing_at', label: 'Em preparo' },
                { key: 'ready_at', label: 'Pronto' },
                ...(isDeliveryOrder ? [{ key: 'out_for_delivery_at', label: 'Saiu p/ entrega' }] : []),
                { key: 'delivered_at', label: isDeliveryOrder ? 'Entregue' : 'Finalizado' },
                { key: 'cancelled_at', label: 'Cancelado' },
              ]
                .filter((s) => order[s.key])
                .map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          s.key === 'cancelled_at' ? 'bg-red-400' : 'bg-green-400'
                        }`}
                      />
                      {s.label}
                    </span>
                    <span
                      className={
                        s.key === 'cancelled_at'
                          ? 'text-red-600'
                          : 'text-foreground'
                      }
                    >
                      {new Date(order[s.key]).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Selecionar Entregador */}
      {deliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeliveryModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Selecionar Entregador</h3>
              </div>
              <button
                onClick={() => setDeliveryModal(false)}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
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
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDeliveryPerson === person.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border'
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

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/50">
              <Button variant="outline" onClick={() => setDeliveryModal(false)}>
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
