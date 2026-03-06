import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Receipt,
  ArrowRightLeft,
  XCircle,
  Loader2,
  Clock,
  Package,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { cn } from '../utils/cn';

interface Session {
  id: string;
  table_id: string;
  opened_at: string;
  closed_at?: string;
  orders?: Order[];
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: { product_name: string; quantity: number; unit_price: number }[];
  created_at: string;
}

interface TableInfo {
  id: string;
  number: number;
  label?: string;
  capacity: number;
  status: string;
}

const orderStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-800' },
  served: { label: 'Servido', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export default function TableDetail() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [table, setTable] = useState<TableInfo | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tableId) return;
    try {
      const [tableRes, sessionRes] = await Promise.all([
        api.get(`/tables/${tableId}`),
        api.get(`/table-sessions/active/${tableId}`).catch(() => ({ data: null })),
      ]);
      setTable(tableRes.data);

      if (sessionRes.data) {
        const sessionDetail = await api.get(`/table-sessions/${sessionRes.data.id}`);
        setSession(sessionDetail.data);
      } else {
        setSession(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocket({
    'table:status-updated': () => fetchData(),
    'order:created': () => fetchData(),
    'order:updated': () => fetchData(),
  });

  const handleOpenSession = async () => {
    if (!tableId) return;
    setActionLoading('open');
    try {
      await api.post('/table-sessions/open', { table_id: tableId });
      await fetchData();
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    setActionLoading('close');
    try {
      await api.post(`/table-sessions/${session.id}/close`);
      setShowCloseConfirm(false);
      await fetchData();
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const handleTransfer = async (targetTableId: string) => {
    if (!session) return;
    setActionLoading('transfer');
    try {
      await api.post(`/table-sessions/${session.id}/transfer`, { table_id: targetTableId });
      setShowTransfer(false);
      navigate(`/tables/${targetTableId}`, { replace: true });
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const openTransferModal = async () => {
    try {
      const { data } = await api.get('/tables');
      setAvailableTables(data.filter((t: TableInfo) => t.status === 'available' && t.id !== tableId));
      setShowTransfer(true);
    } catch {
      // ignore
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/')} className="p-1 active:scale-95">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mesa {table?.number}</h1>
            {table?.label && <p className="text-xs text-gray-500">{table.label}</p>}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Session Info */}
        {!session ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-gray-700 font-medium">Mesa disponivel</p>
            <p className="text-xs text-gray-400 mt-1">Nenhuma comanda aberta</p>
            <button
              onClick={handleOpenSession}
              disabled={actionLoading === 'open'}
              className="mt-4 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors active:scale-95 disabled:opacity-50"
            >
              {actionLoading === 'open' ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Abrir Mesa'}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Aberta as {formatTime(session.opened_at)}</span>
                </div>
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Ocupada
                </span>
              </div>
            </div>

            {/* Orders */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 px-1">
                Pedidos ({session.orders?.length || 0})
              </h2>
              {session.orders && session.orders.length > 0 ? (
                session.orders.map((order) => {
                  const statusCfg = orderStatusLabels[order.status] || orderStatusLabels.pending;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          #{order.order_number}
                        </span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                        <span className="text-xs text-gray-400">{formatTime(order.created_at)}</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                  <p className="text-sm text-gray-400">Nenhum pedido ainda</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      {session && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => navigate(`/tables/${tableId}/new-order`)}
              className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
            <button
              onClick={() => navigate(`/tables/${tableId}/bill`)}
              className="flex items-center justify-center gap-2 py-2.5 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary-50 transition-colors active:scale-95"
            >
              <Receipt className="w-4 h-4" />
              Ver Conta
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={openTransferModal}
              className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transferir
            </button>
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="flex items-center justify-center gap-2 py-2 text-sm text-danger rounded-xl hover:bg-red-50 transition-colors active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              Fechar Mesa
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Transferir para</h3>
            {availableTables.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma mesa disponivel</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTransfer(t.id)}
                    disabled={actionLoading === 'transfer'}
                    className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center hover:bg-emerald-100 transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <span className="text-lg font-bold text-gray-900">{t.number}</span>
                    {t.label && <p className="text-[10px] text-gray-400 truncate">{t.label}</p>}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowTransfer(false)}
              className="w-full mt-4 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900">Fechar Mesa?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Tem certeza que deseja fechar esta mesa? A comanda sera encerrada.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseSession}
                disabled={actionLoading === 'close'}
                className="flex-1 py-2.5 bg-danger text-white font-semibold rounded-xl hover:bg-red-600 transition-colors active:scale-95 disabled:opacity-50"
              >
                {actionLoading === 'close' ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
