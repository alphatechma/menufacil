import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Truck,
  Home,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useGetOrderTrackingQuery } from '@/api/customerApi';
import { useSocket } from '@/hooks/useSocket';
import { formatPrice } from '@/utils/formatPrice';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface StatusStep {
  status: OrderStatus;
  label: string;
  description: string;
  icon: typeof Clock;
}

const STATUS_STEPS: StatusStep[] = [
  {
    status: 'pending',
    label: 'Pedido recebido',
    description: 'Aguardando confirmacao do restaurante',
    icon: Clock,
  },
  {
    status: 'confirmed',
    label: 'Confirmado',
    description: 'O restaurante aceitou seu pedido',
    icon: CheckCircle2,
  },
  {
    status: 'preparing',
    label: 'Em preparo',
    description: 'Seu pedido esta sendo preparado',
    icon: ChefHat,
  },
  {
    status: 'ready',
    label: 'Pronto',
    description: 'Pedido pronto, aguardando entregador',
    icon: Package,
  },
  {
    status: 'out_for_delivery',
    label: 'Saiu para entrega',
    description: 'O entregador esta a caminho',
    icon: Truck,
  },
  {
    status: 'delivered',
    label: 'Entregue',
    description: 'Pedido entregue com sucesso!',
    icon: Home,
  },
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  return STATUS_STEPS.findIndex((s) => s.status === status);
}

export default function OrderTracking() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, error, refetch } = useGetOrderTrackingQuery(
    { slug: slug!, orderId: orderId! },
    {
      skip: !slug || !orderId,
      pollingInterval: 15000,
    },
  );

  // Real-time updates via socket
  useSocket(slug || null, {
    'order-updated': () => {
      refetch();
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-gray-500 text-lg mb-4">
          {(error as any)?.data?.message || 'Pedido nao encontrado'}
        </p>
        <button
          onClick={() => navigate(`/${slug}`)}
          className="px-6 py-3 rounded-xl text-white font-semibold transition-colors"
          style={{ backgroundColor: 'var(--tenant-primary)' }}
        >
          Voltar ao inicio
        </button>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${slug}`)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Pedido #{order.id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-xs text-gray-400">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Status Banner */}
      <div
        className={`px-4 py-5 text-white ${
          isCancelled
            ? 'bg-red-500'
            : isDelivered
            ? 'bg-green-500'
            : ''
        }`}
        style={
          !isCancelled && !isDelivered
            ? {
                background: `linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))`,
              }
            : {}
        }
      >
        <div className="flex items-center gap-3">
          {isCancelled ? (
            <XCircle className="w-8 h-8" />
          ) : isDelivered ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <div>
            <h3 className="font-bold text-lg">
              {isCancelled
                ? 'Pedido cancelado'
                : isDelivered
                ? 'Pedido entregue!'
                : STATUS_STEPS[currentStepIndex]?.label || 'Processando'}
            </h3>
            <p className="text-white/80 text-sm">
              {isCancelled
                ? 'Seu pedido foi cancelado'
                : isDelivered
                ? 'Esperamos que aproveite sua refeicao!'
                : STATUS_STEPS[currentStepIndex]?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Status Stepper */}
      {!isCancelled && (
        <section className="px-4 pt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="font-bold text-gray-900 mb-5">
              Acompanhe seu pedido
            </h4>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isLast = index === STATUS_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex gap-4">
                    {/* Line and dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isCompleted
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-[var(--tenant-primary)]/20' : ''}`}
                        style={
                          isCompleted
                            ? { backgroundColor: 'var(--tenant-primary)' }
                            : {}
                        }
                      >
                        <StepIcon className="w-5 h-5" />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-8 my-1 rounded-full ${
                            index < currentStepIndex
                              ? 'bg-[var(--tenant-primary)]'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="pb-6">
                      <p
                        className={`font-semibold text-sm ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isCompleted ? 'text-gray-500' : 'text-gray-300'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Order Details */}
      <section className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="font-bold text-gray-900 mb-4">Detalhes do pedido</h4>

          <div className="space-y-3 mb-4">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-gray-800 font-medium">
                    {item.quantity}x {item.product_name}
                  </p>
                  {item.variation_name && (
                    <p className="text-xs text-gray-400">
                      {item.variation_name}
                    </p>
                  )}
                  {item.extras && item.extras.length > 0 && (
                    <p className="text-xs text-gray-400">
                      + {item.extras.map((e: any) => e.extra_name || e.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-gray-700 font-medium whitespace-nowrap">
                  {formatPrice(
                    (item.unit_price +
                      (item.extras?.reduce((s: number, e: any) => s + (e.extra_price || e.price || 0), 0) || 0)) *
                      item.quantity,
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Taxa de entrega</span>
              <span>
                {order.delivery_fee === 0
                  ? 'Gratis'
                  : formatPrice(order.delivery_fee)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Address */}
      {order.address_snapshot && (
        <section className="px-4 pt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="font-bold text-gray-900 mb-2">Endereco de entrega</h4>
            <p className="text-sm text-gray-600">
              {order.address_snapshot.street}, {order.address_snapshot.number}
              {order.address_snapshot.complement && ` - ${order.address_snapshot.complement}`}
            </p>
            <p className="text-sm text-gray-600">
              {order.address_snapshot.neighborhood} - {order.address_snapshot.city}
              {order.address_snapshot.state && `/${order.address_snapshot.state}`}
            </p>
            {order.address_snapshot.zip_code && (
              <p className="text-sm text-gray-400 mt-1">
                CEP: {order.address_snapshot.zip_code}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Back to store */}
      <div className="px-4 pt-6">
        <Link
          to={`/${slug}`}
          className="block w-full text-center py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
        >
          Voltar ao inicio
        </Link>
      </div>
    </div>
  );
}
