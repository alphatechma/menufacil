import { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Clock,
  Check,
  ChefHat,
  Package,
  XCircle,
  Timer,
  Truck,
  UtensilsCrossed,
  RefreshCw,
  Printer,
} from 'lucide-react';
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDeliveryPersonsQuery,
  useAssignDeliveryPersonMutation,
} from '@/api/api';
import { useAppSelector } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { usePrinter } from '@/hooks/usePrinter';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: <Check className="w-3 h-3" /> },
  preparing: { label: 'Preparando', color: 'bg-indigo-100 text-indigo-700', icon: <ChefHat className="w-3 h-3" /> },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-700', icon: <Package className="w-3 h-3" /> },
  out_for_delivery: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700', icon: <Check className="w-3 h-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

const STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'preparing', label: 'Em Preparo' },
  { key: 'ready', label: 'Prontos' },
  { key: 'out_for_delivery', label: 'Em Entrega' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'cancelled', label: 'Cancelados' },
];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  pending: { status: 'confirmed', label: 'Confirmar' },
  confirmed: { status: 'preparing', label: 'Preparar' },
  preparing: { status: 'ready', label: 'Pronto' },
  out_for_delivery: { status: 'delivered', label: 'Entregue' },
};

function getOrderTypeLabel(type?: string) {
  if (type === 'delivery') return 'Delivery';
  if (type === 'pickup') return 'Retirada';
  if (type === 'dine_in') return 'Mesa';
  return 'Pedido';
}

function getOrderTypeIcon(type?: string) {
  if (type === 'delivery') return <Truck className="w-3 h-3" />;
  if (type === 'dine_in') return <UtensilsCrossed className="w-3 h-3" />;
  return <Package className="w-3 h-3" />;
}

function getElapsedTime(order: any): string | null {
  if (order.status === 'delivered' && order.delivered_at && order.created_at) {
    const diff = Math.round((new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / 60000);
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }
  if (order.status === 'cancelled') return null;
  if (!order.created_at) return null;
  const diff = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}min`;
}

function getTimeColor(order: any): string {
  if (order.status === 'delivered') return 'text-green-600';
  if (!order.created_at) return 'text-gray-400';
  const diff = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (diff >= 30) return 'text-red-600';
  if (diff >= 15) return 'text-amber-600';
  return 'text-gray-500';
}

export default function Orders() {
  const notify = useNotify();
  const { printReceipt } = usePrinter();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [, setTick] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deliveryModalOrderId, setDeliveryModalOrderId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: orders = [], isLoading, refetch } = useGetOrdersQuery(undefined, {
    pollingInterval: 15000,
  });
  const [updateStatus] = useUpdateOrderStatusMutation();
  const { data: deliveryPersons = [] } = useGetDeliveryPersonsQuery();
  const [assignDeliveryPerson] = useAssignDeliveryPersonMutation();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return orders
      .filter((o: any) => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        // For "all" tab, filter by selected date
        if (statusFilter === 'all' && dateFilter) {
          const orderDate = new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
          if (orderDate !== dateFilter) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, statusFilter, dateFilter]);

  const statusCounts = useMemo(() => {
    const todayOrders = dateFilter
      ? orders.filter((o: any) => new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === dateFilter)
      : orders;
    const counts: Record<string, number> = { all: todayOrders.length };
    for (const tab of STATUS_TABS) if (tab.key !== 'all') counts[tab.key] = 0;
    for (const o of orders) {
      if (counts[o.status] !== undefined) counts[o.status]++;
    }
    return counts;
  }, [orders]);

  const handleAdvance = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateStatus({ id: orderId, status: nextStatus }).unwrap();
    } catch { notify.error('Erro ao atualizar status do pedido.'); }
    setUpdatingId(null);
  };

  const handleAssignDelivery = async (orderId: string, deliveryPersonId: string) => {
    setUpdatingId(orderId);
    try {
      await assignDeliveryPerson({ id: orderId, delivery_person_id: deliveryPersonId }).unwrap();
      await updateStatus({ id: orderId, status: 'out_for_delivery' }).unwrap();
      setDeliveryModalOrderId(null);
    } catch { notify.error('Erro ao atribuir entregador.'); }
    setUpdatingId(null);
  };

  const handleCancel = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await updateStatus({ id: orderId, status: 'cancelled' }).unwrap();
    } catch { notify.error('Erro ao cancelar pedido.'); }
    setUpdatingId(null);
  };

  const handlePrint = async (order: any) => {
    const printerKey = localStorage.getItem('menufacil_default_printer');
    if (!printerKey) {
      notify.warning('Nenhuma impressora padrão configurada. Vá em Configurações → Impressora.');
      return;
    }
    try {
      await printReceipt(JSON.stringify(order), printerKey);
      notify.success('Pedido enviado para impressão!');
    } catch (err: any) {
      notify.error(err?.message || 'Erro ao imprimir pedido.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Status Tabs + Date Filter */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {statusFilter === 'all' && (
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="mr-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:border-orange-400 focus:outline-none"
          />
        )}
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              statusFilter === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && (
              <span className={cn(
                'ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full',
                statusFilter === tab.key
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-500',
              )}>
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <ShoppingCart className="w-16 h-16 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum pedido {STATUS_TABS.find(t => t.key === statusFilter)?.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 pb-4">
          {filtered.map((order: any) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const next = NEXT_STATUS[order.status];
            const elapsed = getElapsedTime(order);
            const timeColor = getTimeColor(order);
            const customerName = order.customer?.name || order.customer_name || (order.order_type === 'dine_in' && order.table ? `Mesa ${order.table.number}` : 'Cliente');
            const itemCount = order.items?.length || 0;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">#{order.order_number}</span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', config.color)}>
                        {config.icon}
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{customerName}</p>
                  </div>
                  {elapsed && (
                    <span className={cn('flex items-center gap-1 text-xs font-semibold', timeColor)}>
                      <Timer className="w-3 h-3" />
                      {elapsed}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{itemCount} item(s)</span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600',
                    )}>
                      {getOrderTypeIcon(order.order_type)}
                      {getOrderTypeLabel(order.order_type)}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="space-y-1 mb-3">
                    {order.items?.slice(0, 3).map((item: any, idx: number) => (
                      <p key={idx} className="text-xs text-gray-600 truncate">
                        {item.quantity}x {item.product_name || item.product?.name || 'Produto'}
                      </p>
                    ))}
                    {itemCount > 3 && (
                      <p className="text-xs text-gray-400">+{itemCount - 3} mais...</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <span className="text-base font-bold text-gray-900">
                      {formatPrice(order.total || 0)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                          : ''}
                      </span>
                      <button
                        onClick={() => handlePrint(order)}
                        className="text-xs text-gray-500 hover:text-primary font-medium flex items-center gap-1 transition-colors"
                        title="Imprimir pedido"
                      >
                        <Printer className="w-3 h-3" />
                        Imprimir
                      </button>
                      <button
                        onClick={() => setDetailOrderId(order.id)}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="px-4 pb-3 flex items-center gap-2">
                    {next && (
                      <button
                        onClick={() => handleAdvance(order.id, next.status)}
                        disabled={updatingId === order.id}
                        className="flex-1 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 active:scale-95"
                      >
                        {updatingId === order.id ? 'Atualizando...' : next.label}
                      </button>
                    )}
                    {order.status === 'ready' && order.order_type === 'delivery' && (
                      <button
                        onClick={() => setDeliveryModalOrderId(order.id)}
                        disabled={updatingId === order.id}
                        className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Selecionar Entregador
                      </button>
                    )}
                    {order.status === 'ready' && order.order_type !== 'delivery' && (
                      <button
                        onClick={() => handleAdvance(order.id, 'delivered')}
                        disabled={updatingId === order.id}
                        className="flex-1 py-2 rounded-xl text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 active:scale-95"
                      >
                        {updatingId === order.id ? 'Atualizando...' : 'Entregar'}
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={updatingId === order.id}
                      className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-95"
                      title="Cancelar pedido"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delivery Person Modal */}
      {deliveryModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Selecionar Entregador</h2>
              <button
                onClick={() => setDeliveryModalOrderId(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              {deliveryPersons.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Nenhum entregador cadastrado
                </p>
              ) : (
                <div className="space-y-2">
                  {deliveryPersons.map((dp: any) => (
                    <button
                      key={dp.id}
                      onClick={() => handleAssignDelivery(deliveryModalOrderId, dp.id)}
                      disabled={updatingId === deliveryModalOrderId}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-colors disabled:opacity-50 active:scale-[0.98]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                        {dp.name?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-gray-900">{dp.name}</p>
                        {dp.phone && <p className="text-xs text-gray-500">{dp.phone}</p>}
                      </div>
                      <Truck className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrderId && (() => {
        const order = orders.find((o: any) => o.id === detailOrderId);
        if (!order) return null;
        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">Pedido #{order.order_number}</h2>
                  <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', config.color)}>
                    {config.icon} {config.label}
                  </span>
                </div>
                <button onClick={() => setDetailOrderId(null)} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Customer */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {(order.customer?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{order.customer?.name || order.customer_name || 'Cliente'}</p>
                    {order.customer?.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                      {getOrderTypeIcon(order.order_type)} {getOrderTypeLabel(order.order_type)}
                    </span>
                  </div>
                </div>

                {/* Address */}
                {order.order_type === 'delivery' && order.address_snapshot && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Endereço de entrega</p>
                    <p className="text-sm text-blue-900">{order.address_snapshot.street}{order.address_snapshot.number ? `, ${order.address_snapshot.number}` : ''}</p>
                    {order.address_snapshot.complement && <p className="text-xs text-blue-700">{order.address_snapshot.complement}</p>}
                    {order.address_snapshot.neighborhood && <p className="text-xs text-blue-700">{order.address_snapshot.neighborhood}</p>}
                  </div>
                )}

                {/* Table */}
                {order.order_type === 'dine_in' && order.table && (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-sm font-bold text-amber-800 flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Mesa {order.table.number}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens</p>
                  <div className="space-y-2">
                    {order.items?.map((item: any, idx: number) => {
                      const extras = item.extras || [];
                      const unitPrice = Number(item.unit_price || 0);
                      const extrasTotal = extras.reduce((s: number, e: any) => s + Number(e.extra_price || e.price || 0), 0);
                      const lineTotal = (unitPrice + extrasTotal) * (item.quantity || 1);
                      return (
                        <div key={idx} className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.quantity}x {item.product_name || 'Produto'}</p>
                            {item.variation_name && <p className="text-xs text-gray-500 ml-4">{item.variation_name}</p>}
                            {extras.map((e: any, i: number) => <p key={i} className="text-xs text-gray-400 ml-4">+ {e.extra_name || e.name}</p>)}
                            {item.notes && <p className="text-xs text-amber-600 ml-4 italic">Obs: {item.notes}</p>}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{formatPrice(lineTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal || 0)}</span></div>
                  {Number(order.delivery_fee) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Taxa entrega</span><span>{formatPrice(order.delivery_fee)}</span></div>}
                  {Number(order.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Desconto</span><span className="text-green-600">-{formatPrice(order.discount)}</span></div>}
                  <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-100"><span>Total</span><span className="text-primary">{formatPrice(order.total || 0)}</span></div>
                </div>

                {/* Payment + timestamps */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs text-gray-600">
                  <p>Pagamento: <span className="font-medium text-gray-900">{order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'credit_card' ? 'Crédito' : order.payment_method === 'debit_card' ? 'Débito' : order.payment_method || '-'}</span></p>
                  {order.change_for > 0 && <p>Troco para: {formatPrice(order.change_for)}</p>}
                  <p>Criado: {new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                  {order.delivery_person && <p>Entregador: <span className="font-medium text-gray-900">{order.delivery_person.name}</span></p>}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-800">Obs: {order.notes}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePrint(order)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  onClick={() => setDetailOrderId(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
