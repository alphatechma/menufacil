import {
  ShoppingCart,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGetAbandonedCartsQuery,
  useGetAbandonedCartStatsQuery,
} from '@/api/adminApi';
import { formatPrice } from '@/utils/formatPrice';

function timeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d atras`;
  if (diffHours > 0) return `${diffHours}h atras`;
  return `${diffMins}min atras`;
}

export default function AbandonedCarts() {
  const { data: carts, isLoading } = useGetAbandonedCartsQuery();
  const { data: stats, isLoading: loadingStats } = useGetAbandonedCartStatsQuery();

  return (
    <div>
      <PageHeader
        title="Carrinhos Abandonados"
        description="Acompanhe carrinhos nao finalizados"
      />

      {/* Stats */}
      {!loadingStats && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">Abandonados</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_abandoned}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">Recuperados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.total_recovered}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-500">Taxa de Recuperacao</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {stats.recovery_rate}%
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-500">Receita Perdida</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatPrice(stats.lost_revenue)}
            </p>
          </div>
        </div>
      )}

      {/* Carts table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !carts || carts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum carrinho abandonado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Itens
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Tempo
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Notificacao
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carts.map((cart: any) => (
                  <tr key={cart.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {cart.customer_name}
                      </p>
                      <p className="text-xs text-gray-400">{cart.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 max-w-[200px] truncate">
                        {cart.items_summary}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(cart.total)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {timeAgo(cart.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cart.notification_sent ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {carts.map((cart: any) => (
              <div key={cart.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {cart.customer_name}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(cart.total)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1 truncate">
                  {cart.items_summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(cart.created_at)}
                  </span>
                  {cart.notification_sent ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Notificado
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
