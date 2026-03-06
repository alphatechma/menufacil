import { Link, useParams } from 'react-router-dom';
import {
  Truck,
  Phone,
  Clock,
  ShoppingCart,
  Check,
  ChefHat,
  Package,
  XCircle,
} from 'lucide-react';
import { useGetDeliveryPersonQuery } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/utils/formatPrice';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: <Check className="w-3 h-3" /> },
  preparing: { label: 'Preparando', color: 'bg-indigo-100 text-indigo-700', icon: <ChefHat className="w-3 h-3" /> },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-700', icon: <Package className="w-3 h-3" /> },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700', icon: <Check className="w-3 h-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

export default function DeliveryPersonDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading } = useGetDeliveryPersonQuery(id!);

  if (isLoading || !person) return <PageSpinner />;

  const activeOrders = person.orders?.filter(
    (o: any) => o.status === 'out_for_delivery' || o.status === 'ready',
  ) || [];
  const completedOrders = person.orders?.filter(
    (o: any) => o.status === 'delivered',
  ) || [];
  const allOrders = person.orders || [];

  return (
    <div>
      <PageHeader
        title={person.name}
        backTo="/admin/delivery-persons"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Truck className="w-7 h-7 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{person.name}</h2>
                <Badge className={person.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}>
                  {person.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                {person.phone}
              </div>
              {person.vehicle && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {person.vehicle}
                </div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{activeOrders.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pedidos Ativos</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{completedOrders.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entregas Realizadas</p>
            </Card>
          </div>
        </div>

        {/* Orders */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Pedidos ({allOrders.length})
              </h2>
            </div>

            {allOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="w-10 h-10" />}
                title="Nenhum pedido atribuido"
                description="Este entregador ainda nao possui pedidos atribuidos."
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {allOrders.map((order: any) => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <Link
                      key={order.id}
                      to={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-slate-700 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            #{order.order_number}
                          </p>
                          <Badge className={config.color}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {order.customer?.name || 'Cliente'}
                          {' - '}
                          {new Date(order.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-4">
                        {formatPrice(order.total)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
