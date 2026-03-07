import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Clock,
  Check,
  Phone,
  MapPin,
  User,
  Package,
  Timer,
  TrendingUp,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetOrderPerformanceStatsQuery,
} from '@/api/adminApi';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector } from '@/store/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/utils/formatPrice';

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getUrgencyStyle(minutes: number): string {
  if (minutes >= 45) return 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20';
  if (minutes >= 30) return 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20';
  return 'border-border bg-card';
}

function getTimeBadgeStyle(minutes: number): string {
  if (minutes >= 45) return 'bg-red-100 text-red-700 border-red-200';
  if (minutes >= 30) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

export default function DeliveryTracker() {
  const [, setTick] = useState(0);

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const { data: perfStats } = useGetOrderPerformanceStatsQuery({ days: 7 });

  // Update timer every 15s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefetch = useCallback(() => { refetch(); }, [refetch]);
  useSocket(tenantSlug, {
    'order:new': handleRefetch,
    'order:status-updated': handleRefetch,
  });

  const activeDeliveries = useMemo(() =>
    orders
      .filter((o: any) => o.status === 'out_for_delivery')
      .sort((a: any, b: any) =>
        new Date(a.out_for_delivery_at || a.created_at).getTime() -
        new Date(b.out_for_delivery_at || b.created_at).getTime()
      ),
    [orders],
  );

  const recentDelivered = useMemo(() =>
    orders
      .filter((o: any) => o.status === 'delivered' && o.delivered_at)
      .sort((a: any, b: any) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime())
      .slice(0, 10),
    [orders],
  );

  const handleMarkDelivered = async (orderId: string) => {
    await updateStatus({ id: orderId, status: 'delivered' }).unwrap();
  };

  if (isLoading) return <ListPageSkeleton />;

  const avgDeliveryTime = perfStats?.avg_delivery_time ?? 0;
  const totalDelivered = perfStats?.total_completed ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-7 h-7 text-primary" />
            Entregas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe os pedidos em entrega em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground bg-card border border-border px-4 py-2 rounded-xl">
            <span className="font-bold text-primary">{activeDeliveries.length}</span> em entrega
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Truck className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeDeliveries.length}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Em Entrega</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMinutes(avgDeliveryTime)}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tempo Medio</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <Zap className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMinutes(perfStats?.fastest_order ?? 0)}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mais Rapido</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDelivered}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Entregues (7d)</p>
        </Card>
      </div>

      {/* Active Deliveries */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Em Entrega Agora
        </h2>

        {activeDeliveries.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum pedido em entrega no momento</p>
            <p className="text-sm text-muted-foreground mt-1">Pedidos apareceraoaqui quando forem enviados para entrega</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeDeliveries.map((order: any) => {
              const startTime = order.out_for_delivery_at || order.created_at;
              const elapsed = getElapsedMinutes(startTime);
              const urgency = getUrgencyStyle(elapsed);
              const timeBadge = getTimeBadgeStyle(elapsed);

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 p-5 transition-all ${urgency}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                    >
                      #{order.order_number}
                    </Link>
                    <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border ${timeBadge}`}>
                      {elapsed >= 45 && <AlertTriangle className="w-3 h-3" />}
                      <Timer className="w-3 h-3" />
                      {formatMinutes(elapsed)}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer?.name || 'Cliente'}</span>
                    {order.customer?.phone && (
                      <a href={`tel:${order.customer.phone}`} className="text-primary hover:underline flex items-center gap-1 ml-auto">
                        <Phone className="w-3.5 h-3.5" />
                        {order.customer.phone}
                      </a>
                    )}
                  </div>

                  {/* Address */}
                  {order.address_snapshot && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p>
                          {order.address_snapshot.street}
                          {order.address_snapshot.number ? `, ${order.address_snapshot.number}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.address_snapshot.neighborhood}
                          {order.address_snapshot.city ? ` - ${order.address_snapshot.city}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="bg-muted/70 rounded-xl px-3 py-2 mb-3 border border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">{order.items?.length || 0} item(s)</p>
                    <div className="space-y-0.5">
                      {order.items?.slice(0, 3).map((item: any, idx: number) => (
                        <p key={idx} className="text-xs text-muted-foreground truncate">
                          {item.quantity}x {item.product_name || item.product?.name}
                        </p>
                      ))}
                      {order.items?.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 3} mais</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1 pt-1 border-t border-border">
                      {formatPrice(order.total || 0)}
                    </p>
                  </div>

                  {/* Delivery Person */}
                  {order.delivery_person && (
                    <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{order.delivery_person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.delivery_person.phone}
                          {order.delivery_person.vehicle && ` · ${order.delivery_person.vehicle}`}
                        </p>
                      </div>
                      <a
                        href={`tel:${order.delivery_person.phone}`}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Mark as Delivered */}
                  <Button
                    className="w-full"
                    onClick={() => handleMarkDelivered(order.id)}
                    disabled={isUpdating}
                    loading={isUpdating}
                  >
                    <Check className="w-4 h-4" />
                    <span className="ml-1">Marcar como Entregue</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Delivered */}
      {recentDelivered.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Entregues Recentemente
          </h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedido</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregador</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo de Entrega</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entregue em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentDelivered.map((order: any) => {
                    const deliveryTime = order.out_for_delivery_at && order.delivered_at
                      ? Math.round((new Date(order.delivered_at).getTime() - new Date(order.out_for_delivery_at).getTime()) / 60000)
                      : null;

                    return (
                      <tr key={order.id} className="hover:bg-accent transition-colors">
                        <td className="px-5 py-3">
                          <Link to={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground">
                          {order.customer?.name || '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground">
                          {order.delivery_person?.name || '-'}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {formatPrice(order.total || 0)}
                        </td>
                        <td className="px-5 py-3">
                          {deliveryTime !== null ? (
                            <Badge className={deliveryTime > 45 ? 'bg-red-100 text-red-700' : deliveryTime > 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                              <Timer className="w-3 h-3" />
                              <span className="ml-1">{formatMinutes(deliveryTime)}</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {order.delivered_at
                            ? new Date(order.delivered_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
