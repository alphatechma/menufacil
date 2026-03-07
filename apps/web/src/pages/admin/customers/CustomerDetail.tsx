import { useParams, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Star,
  Calendar,
  MapPin,
  ShoppingCart,
} from 'lucide-react';
import { useGetCustomerQuery } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';

const ORDER_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'info' },
  preparing: { label: 'Preparando', variant: 'info' },
  ready: { label: 'Pronto', variant: 'success' },
  out_for_delivery: { label: 'Em Entrega', variant: 'default' },
  delivered: { label: 'Entregue', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useGetCustomerQuery(id!);

  if (isLoading || !customer) return <PageSpinner />;

  return (
    <div>
      <PageHeader title={customer.name || 'Cliente'} backTo="/admin/customers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
                <p className="text-sm text-muted-foreground">Cliente</p>
              </div>
            </div>

            <div className="space-y-4">
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {formatPhone(customer.phone)}
                  </span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{customer.email}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{customer.loyalty_points || 0}</span>{' '}
                  pontos de fidelidade
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Cliente desde{' '}
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
            </div>
          </Card>

          {/* Addresses */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Enderecos</h2>
            </div>

            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="space-y-3">
                {customer.addresses.map((addr: any, idx: number) => (
                  <div
                    key={addr.id || idx}
                    className="bg-muted/50 rounded-xl p-4 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {addr.street}
                      {addr.number ? `, ${addr.number}` : ''}
                    </p>
                    {addr.complement && (
                      <p className="text-muted-foreground">{addr.complement}</p>
                    )}
                    <p className="text-muted-foreground">
                      {addr.neighborhood}
                      {addr.city ? ` - ${addr.city}` : ''}
                    </p>
                    {addr.zip_code && (
                      <p className="text-muted-foreground text-xs mt-1">CEP: {addr.zip_code}</p>
                    )}
                    {addr.label && (
                      <Badge variant="default" className="mt-2">
                        {addr.label}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum endereco cadastrado
              </p>
            )}
          </Card>
        </div>

        {/* Right Column - Orders */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Pedidos Recentes</h2>
            </div>

            {customer.orders && customer.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Data
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Itens
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Total
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customer.orders.map((order: any) => {
                      const statusInfo =
                        ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.pending;

                      return (
                        <tr key={order.id} className="hover:bg-accent transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              #{order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {order.items?.length || 0} item(s)
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {formatPrice(order.total || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum pedido registrado para este cliente
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
