import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Star,
  Calendar,
  MapPin,
  ShoppingCart,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useGetCustomerQuery, useGetCustomerWalletQuery, useAddWalletCreditMutation } from '@/api/adminApi';
import { useNotify } from '@/hooks/useNotify';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DetailPageSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/utils/formatPrice';
import { formatPhone } from '@/utils/formatPhone';
import { cn } from '@/utils/cn';

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
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useGetCustomerQuery(id!);
  const { data: walletInfo } = useGetCustomerWalletQuery(id!, { skip: !id });
  const [addCredit, { isLoading: isAddingCredit }] = useAddWalletCreditMutation();

  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [showCreditForm, setShowCreditForm] = useState(false);

  const handleAddCredit = async () => {
    if (!creditAmount || !creditDescription || !id) return;
    try {
      await addCredit({
        customerId: id,
        amount: Number(creditAmount),
        description: creditDescription,
      }).unwrap();
      setCreditAmount('');
      setCreditDescription('');
      setShowCreditForm(false);
      notify.success('Credito adicionado com sucesso!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao adicionar credito.');
    }
  };

  if (isLoading || !customer) return <DetailPageSkeleton />;

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

          {/* Wallet */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Carteira Digital</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreditForm(!showCreditForm)}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Credito
              </Button>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Saldo</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(walletInfo?.balance ?? 0)}
              </p>
            </div>

            {showCreditForm && (
              <div className="space-y-3 mb-4 p-4 bg-muted/50 rounded-xl">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Valor (R$)"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
                <Input
                  placeholder="Descricao (ex: Bonificacao)"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddCredit}
                    loading={isAddingCredit}
                    disabled={!creditAmount || !creditDescription}
                  >
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCreditForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {walletInfo?.transactions && walletInfo.transactions.length > 0 ? (
              <div className="space-y-2">
                {walletInfo.transactions.slice(0, 5).map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center',
                          tx.type === 'credit'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600',
                        )}
                      >
                        {tx.type === 'credit' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        tx.type === 'credit' ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatPrice(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma transacao
              </p>
            )}
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
