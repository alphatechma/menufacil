import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bike,
  Package,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle2,
  Navigation,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';
import { PageSpinner } from '@/components/ui/Spinner';

/** Parse date ensuring UTC interpretation (server returns UTC without Z suffix) */
function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it already has timezone info, parse as-is
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Otherwise treat as UTC
  return new Date(dateStr + 'Z');
}

function getTimeSince(dateStr: string): { text: string; minutes: number } {
  const now = new Date();
  const created = parseUTC(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return { text: 'agora', minutes: 0 };
  if (diffMin < 60) return { text: `${diffMin}min`, minutes: diffMin };
  const h = Math.floor(diffMin / 60);
  return { text: `${h}h ${diffMin % 60}min`, minutes: diffMin };
}

function calcCommission(order: any, dp: any): number {
  if (!dp || dp.commission_type === 'none' || !dp.commission_value) return 0;
  const val = Number(dp.commission_value);
  if (dp.commission_type === 'fixed') return val;
  if (dp.commission_type === 'percent') return (Number(order.total || 0) * val) / 100;
  return 0;
}

export default function MyDeliveries() {
  const [, setTick] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const tenantSlug = useAppSelector((s) => s.adminAuth.tenantSlug);
  const currentUser = useAppSelector((s) => s.adminAuth.user);

  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();

  // Find the delivery person linked to the current user by user_id
  const myDeliveryPerson = deliveryPersons.find(
    (dp: any) => dp.user_id && dp.user_id === currentUser?.id,
  );

  const hasCommission = myDeliveryPerson && myDeliveryPerson.commission_type !== 'none' && Number(myDeliveryPerson.commission_value) > 0;

  // Filter orders assigned to this delivery person
  const myOrders = orders.filter(
    (o: any) =>
      o.delivery_person_id &&
      myDeliveryPerson &&
      o.delivery_person_id === myDeliveryPerson.id,
  );

  const activeDeliveries = myOrders.filter((o: any) =>
    ['ready', 'out_for_delivery'].includes(o.status),
  );
  const completedDeliveries = myOrders
    .filter((o: any) => o.status === 'delivered')
    .slice(0, 50);

  // Earnings
  const earnings = useMemo(() => {
    if (!hasCommission) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayDeliveries = completedDeliveries.filter((o: any) => {
      const d = parseUTC(o.delivered_at || o.updated_at || o.created_at);
      return d >= todayStart;
    });

    const todayEarnings = todayDeliveries.reduce(
      (sum: number, o: any) => sum + calcCommission(o, myDeliveryPerson),
      0,
    );
    const totalEarnings = completedDeliveries.reduce(
      (sum: number, o: any) => sum + calcCommission(o, myDeliveryPerson),
      0,
    );

    return {
      todayCount: todayDeliveries.length,
      todayEarnings,
      totalCount: completedDeliveries.length,
      totalEarnings,
    };
  }, [completedDeliveries, hasCommission, myDeliveryPerson]);

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

  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const handleStartDelivery = async (orderId: string) => {
    await updateStatus({ id: orderId, status: 'out_for_delivery' });
  };

  const handleCompleteDelivery = async (orderId: string) => {
    await updateStatus({ id: orderId, status: 'delivered' });
    setConfirmingOrderId(null);
  };

  if (isLoading) return <PageSpinner />;

  if (!myDeliveryPerson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Bike className="w-10 h-10 text-gray-300 dark:text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Entregador nao vinculado</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Seu usuario ainda nao esta vinculado a um cadastro de entregador.
          Peca ao administrador para vincular seu acesso.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Bike className="w-7 h-7 text-primary" />
            Minhas Entregas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ola, {myDeliveryPerson.name}! Acompanhe e conclua suas entregas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-card border border-border rounded-xl">
            <p className="text-2xl font-bold text-primary">{activeDeliveries.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ativa(s)</p>
          </div>
          <div className="text-center px-4 py-2 bg-card border border-border rounded-xl">
            <p className="text-2xl font-bold text-green-600">{completedDeliveries.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Entregues</p>
          </div>
        </div>
      </div>

      {/* Earnings Panel */}
      {hasCommission && earnings && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-2 border-green-200 dark:border-green-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-green-800 dark:text-green-400">Seus Ganhos</h2>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">
              {myDeliveryPerson.commission_type === 'fixed'
                ? `${formatPrice(Number(myDeliveryPerson.commission_value))} por entrega`
                : `${myDeliveryPerson.commission_value}% por pedido`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hoje</p>
              </div>
              <p className="text-2xl font-black text-green-700 dark:text-green-400">{formatPrice(earnings.todayEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{earnings.todayCount} entrega(s)</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatPrice(earnings.totalEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{earnings.totalCount} entrega(s)</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Deliveries */}
      {activeDeliveries.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Package className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-1">Nenhuma entrega ativa</h3>
          <p className="text-sm text-muted-foreground">
            Quando pedidos forem atribuidos a voce, aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDeliveries.map((order: any) => {
            const time = order.ready_at
              ? getTimeSince(order.ready_at)
              : order.created_at
                ? getTimeSince(order.created_at)
                : { text: '-', minutes: 0 };
            const isOutForDelivery = order.status === 'out_for_delivery';
            const commission = hasCommission ? calcCommission(order, myDeliveryPerson) : 0;
            const customerPhone = order.customer?.phone || order.address_snapshot?.phone;

            return (
              <div
                key={order.id}
                className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
                  isOutForDelivery
                    ? 'border-blue-200 dark:border-blue-700 shadow-md'
                    : 'border-amber-200 dark:border-amber-700 shadow-sm'
                }`}
              >
                {/* Status bar */}
                <div
                  className={`px-5 py-3 flex items-center justify-between ${
                    isOutForDelivery
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-amber-50 dark:bg-amber-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isOutForDelivery ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}
                    >
                      {isOutForDelivery ? (
                        <Navigation className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Package className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">
                        Pedido #{order.order_number || order.id?.slice(0, 6)}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          isOutForDelivery ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isOutForDelivery ? 'Em rota de entrega' : 'Pronto para retirar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {commission > 0 && (
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                        +{formatPrice(commission)}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-bold ${time.minutes >= 30 ? 'text-red-600' : time.minutes >= 15 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {time.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer info -- prominent */}
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground truncate">
                        {order.customer?.name || 'Cliente'}
                      </p>
                      {customerPhone && (
                        <p className="text-sm text-muted-foreground">{customerPhone}</p>
                      )}
                    </div>
                    {customerPhone && (
                      <a
                        href={`tel:${customerPhone}`}
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shrink-0 shadow-sm"
                        title="Ligar para o cliente"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="px-5 py-2 space-y-3">
                  {order.address_snapshot && (
                    <div className="flex items-start gap-3 bg-muted rounded-xl p-3">
                      <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">
                          {order.address_snapshot.street}, {order.address_snapshot.number}
                        </p>
                        {order.address_snapshot.complement && (
                          <p className="text-xs text-muted-foreground">{order.address_snapshot.complement}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {order.address_snapshot.neighborhood} - {order.address_snapshot.city}
                        </p>
                        {order.address_snapshot.reference && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                            Ref: {order.address_snapshot.reference}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens</p>
                    <div className="space-y-1">
                      {order.items?.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            <span className="font-bold text-foreground">{item.quantity}x</span>{' '}
                            {item.product_name || item.product?.name}
                          </span>
                        </div>
                      ))}
                      {order.items?.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          + {order.items.length - 5} item(ns)
                        </p>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex justify-between">
                      <span className="text-sm font-bold text-foreground">Total</span>
                      <span className="text-sm font-bold text-primary">
                        {formatPrice(order.total || 0)}
                      </span>
                    </div>
                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pagamento: <span className="font-medium">{order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method === 'card' ? 'Cartao' : order.payment_method === 'pix' ? 'PIX' : order.payment_method}</span>
                        {order.payment_method === 'cash' && order.change_for ? ` (troco para ${formatPrice(order.change_for)})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="px-5 pb-4 pt-1">
                  {isOutForDelivery ? (
                    <button
                      onClick={() => setConfirmingOrderId(order.id)}
                      disabled={isUpdating}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      Confirmar Entrega
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartDelivery(order.id)}
                      disabled={isUpdating}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-colors disabled:opacity-50"
                    >
                      <Navigation className="w-6 h-6" />
                      Saiu para Entrega
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      )}

      {/* Confirmation Modal */}
      {confirmingOrderId && (() => {
        const order = activeDeliveries.find((o: any) => o.id === confirmingOrderId);
        if (!order) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setConfirmingOrderId(null)}
            />
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Confirmar Entrega</h3>
                    <p className="text-xs text-muted-foreground">Pedido #{order.order_number || order.id?.slice(0, 6)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmingOrderId(null)}
                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Confirme que a entrega para <strong>{order.customer?.name || 'o cliente'}</strong> foi realizada com sucesso.
                </p>
                <div className="bg-muted rounded-xl p-3 mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{order.customer?.name || 'Cliente'}</span>
                  </div>
                  {order.address_snapshot && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">
                        {order.address_snapshot.street}, {order.address_snapshot.number}
                        {order.address_snapshot.complement ? ` - ${order.address_snapshot.complement}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">{formatPrice(order.total || 0)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingOrderId(null)}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleCompleteDelivery(order.id)}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Completed Deliveries */}
      {completedDeliveries.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3 hover:text-gray-800 dark:hover:text-gray-100"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Entregas Concluidas ({completedDeliveries.length})
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {completedDeliveries.map((order: any) => {
                const commission = hasCommission ? calcCommission(order, myDeliveryPerson) : 0;
                return (
                  <div
                    key={order.id}
                    className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          #{order.order_number || order.id?.slice(0, 6)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatPrice(order.total || 0)}</p>
                      {commission > 0 && (
                        <p className="text-xs font-bold text-green-600 dark:text-green-400">+{formatPrice(commission)}</p>
                      )}
                      {order.delivered_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {parseUTC(order.delivered_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
