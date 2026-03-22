import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Users, Split, X } from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';

interface BillOrder {
  id: string;
  order_number: string;
  customer_name?: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
  total: number;
}

interface BillData {
  session_id: string;
  table_number: number;
  orders: BillOrder[];
  subtotal: number;
  total: number;
}

interface SplitResult {
  number_of_people: number;
  total: number;
  per_person: number;
}

interface ConsumptionSplit {
  customer_id: string;
  customer_name: string;
  total: number;
}

export default function TableBill() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showSplitEqual, setShowSplitEqual] = useState(false);
  const [splitPeople, setSplitPeople] = useState(2);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [consumptionSplit, setConsumptionSplit] = useState<ConsumptionSplit[] | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const fetchBill = useCallback(async () => {
    if (!tableId) return;
    try {
      const sessionRes = await api.get(`/table-sessions/active/${tableId}`);
      if (!sessionRes.data) {
        navigate(`/tables/${tableId}`, { replace: true });
        return;
      }
      setSessionId(sessionRes.data.id);
      const billRes = await api.get(`/table-sessions/${sessionRes.data.id}/bill`);
      setBill(billRes.data);
    } catch {
      navigate(`/tables/${tableId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [tableId, navigate]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handleSplitEqual = async () => {
    if (!sessionId) return;
    setActionLoading('split');
    try {
      const { data } = await api.post(`/table-sessions/${sessionId}/split-equal`, {
        number_of_people: splitPeople,
      });
      setSplitResult(data);
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const handleSplitConsumption = async () => {
    if (!sessionId) return;
    setActionLoading('consumption');
    try {
      const { data } = await api.get(`/table-sessions/${sessionId}/split-consumption`);
      setConsumptionSplit(data.by_customer || []);
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const handleClose = async () => {
    if (!sessionId) return;
    setActionLoading('close');
    try {
      await api.post(`/table-sessions/${sessionId}/close`);
      navigate(`/tables/${tableId}`, { replace: true });
    } catch {
      // ignore
    } finally {
      setActionLoading('');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bill) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(`/tables/${tableId}`)} className="p-1 active:scale-95">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Conta - Mesa {bill.table_number}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Orders */}
        {bill.orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-900">#{order.order_number}</span>
              {order.customer_name && (
                <span className="text-xs text-gray-500">{order.customer_name}</span>
              )}
            </div>
            <div className="space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</span>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">{formatCurrency(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-100">
            <span className="text-gray-900">Total</span>
            <span className="text-primary">{formatCurrency(bill.total)}</span>
          </div>
        </div>

        {/* Split Equal Result */}
        {splitResult && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-blue-900">Divisão Igual</h3>
              <button onClick={() => setSplitResult(null)}>
                <X className="w-4 h-4 text-blue-400" />
              </button>
            </div>
            <p className="text-sm text-blue-700">
              {splitResult.number_of_people} pessoas: <span className="font-bold">{formatCurrency(splitResult.per_person)}</span> cada
            </p>
          </div>
        )}

        {/* Consumption Split Result */}
        {consumptionSplit && (
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-purple-900">Divisão por Consumo</h3>
              <button onClick={() => setConsumptionSplit(null)}>
                <X className="w-4 h-4 text-purple-400" />
              </button>
            </div>
            <div className="space-y-2">
              {consumptionSplit.map((person, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-purple-700">{person.customer_name || `Pessoa ${i + 1}`}</span>
                  <span className="font-semibold text-purple-900">{formatCurrency(person.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowSplitEqual(true)}
            className="flex items-center justify-center gap-2 py-2.5 border-2 border-blue-500 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors active:scale-95 text-sm"
          >
            <Users className="w-4 h-4" />
            Dividir Igual
          </button>
          <button
            onClick={handleSplitConsumption}
            disabled={actionLoading === 'consumption'}
            className="flex items-center justify-center gap-2 py-2.5 border-2 border-purple-500 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-colors active:scale-95 text-sm disabled:opacity-50"
          >
            {actionLoading === 'consumption' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Split className="w-4 h-4" />
            )}
            Por Consumo
          </button>
        </div>
        <button
          onClick={() => setShowCloseConfirm(true)}
          className="w-full py-3 bg-danger text-white font-semibold rounded-xl hover:bg-red-600 transition-colors active:scale-95"
        >
          Fechar Conta
        </button>
      </div>

      {/* Split Equal Modal */}
      {showSplitEqual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Dividir Igualmente</h3>
            <div className="flex items-center justify-center gap-6 mb-4">
              <button
                onClick={() => setSplitPeople(Math.max(2, splitPeople - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold active:scale-95"
              >
                -
              </button>
              <span className="text-3xl font-bold text-gray-900">{splitPeople}</span>
              <button
                onClick={() => setSplitPeople(Math.min(20, splitPeople + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold active:scale-95"
              >
                +
              </button>
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">
              {formatCurrency(bill.total / splitPeople)} por pessoa
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSplitEqual(false)}
                className="flex-1 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-300 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => { handleSplitEqual(); setShowSplitEqual(false); }}
                disabled={actionLoading === 'split'}
                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900">Fechar Conta?</h3>
            <p className="text-sm text-gray-500 mt-2">
              O valor total e <span className="font-semibold">{formatCurrency(bill.total)}</span>.
              Deseja encerrar esta conta e liberar a mesa?
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-300 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={actionLoading === 'close'}
                className={cn(
                  'flex-1 py-2.5 bg-danger text-white font-semibold rounded-xl active:scale-95 disabled:opacity-50',
                )}
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
