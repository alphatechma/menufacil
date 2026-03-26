import { useState } from 'react';
import {
  Receipt,
  DollarSign,
  Clock,
  X,
  Lock,
  Unlock,
  Banknote,
  CreditCard,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import {
  useGetCashRegisterQuery,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
} from '@/api/api';
import { useNotify } from '@/hooks/useNotify';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: 'Dinheiro', icon: Banknote },
  credit_card: { label: 'Cartão Crédito', icon: CreditCard },
  debit_card: { label: 'Cartão Débito', icon: CreditCard },
  pix: { label: 'PIX', icon: Smartphone },
};

export default function CashRegister() {
  const notify = useNotify();
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeSummary, setCloseSummary] = useState<any>(null);

  const { data: cashRegister, isLoading, refetch } = useGetCashRegisterQuery();
  const [openCashRegister, { isLoading: isOpening }] = useOpenCashRegisterMutation();
  const [closeCashRegister, { isLoading: isClosing }] = useCloseCashRegisterMutation();

  const isOpen = cashRegister && cashRegister.status === 'open';

  const handleOpen = async () => {
    const balance = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(balance) || balance < 0) {
      notify.warning('Informe um valor valido para o saldo inicial.');
      return;
    }
    try {
      await openCashRegister({ opening_balance: balance }).unwrap();
      setOpeningBalance('');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao abrir o caixa.');
    }
  };

  const handleClose = async () => {
    const balance = parseFloat(closingBalance.replace(',', '.'));
    if (isNaN(balance) || balance < 0) {
      notify.warning('Informe um valor valido para o saldo de fechamento.');
      return;
    }
    try {
      const result = await closeCashRegister({
        closing_balance: balance,
        notes: closeNotes || undefined,
      }).unwrap();
      setShowCloseModal(false);
      setClosingBalance('');
      setCloseNotes('');
      setCloseSummary(result);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao fechar o caixa.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show close summary
  if (closeSummary) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Caixa Fechado</h2>
            <p className="text-sm text-gray-500 mt-1">Resumo do fechamento</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Saldo inicial</span>
              <span className="text-sm font-medium text-gray-900">{formatPrice(closeSummary.opening_balance || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Saldo de fechamento</span>
              <span className="text-sm font-medium text-gray-900">{formatPrice(closeSummary.closing_balance || 0)}</span>
            </div>
            {closeSummary.total_sales !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Total em vendas</span>
                <span className="text-sm font-bold text-green-600">{formatPrice(closeSummary.total_sales || 0)}</span>
              </div>
            )}

            {/* Payment method breakdown */}
            {closeSummary.totals_by_method && Object.keys(closeSummary.totals_by_method).length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Por método de pagamento</p>
                {Object.entries(closeSummary.totals_by_method).map(([method, total]: [string, any]) => {
                  const config = PAYMENT_METHOD_LABELS[method] || { label: method, icon: DollarSign };
                  const Icon = config.icon;
                  return (
                    <div key={method} className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-2 text-sm text-gray-600">
                        <Icon className="w-4 h-4 text-gray-400" />
                        {config.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{formatPrice(total || 0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => { setCloseSummary(null); refetch(); }}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors active:scale-95"
          >
            Fechar resumo
          </button>
        </div>
      </div>
    );
  }

  // Cash register is closed — show open prompt
  if (!isOpen) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
              <Unlock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Abrir Caixa</h2>
            <p className="text-sm text-gray-500 mt-1">Informe o saldo inicial para abrir o caixa</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Saldo inicial (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-lg font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
              />
            </div>
          </div>

          <button
            onClick={handleOpen}
            disabled={isOpening}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-95"
          >
            {isOpening ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </div>
      </div>
    );
  }

  // Cash register is open
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Caixa</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Unlock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Caixa Aberto</h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Aberto em {cashRegister.opened_at
                ? new Date(cashRegister.opened_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '-'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Saldo inicial</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(cashRegister.opening_balance || 0)}</p>
          </div>
          {cashRegister.total_sales !== undefined && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total em vendas</p>
              <p className="text-lg font-bold text-green-600">{formatPrice(cashRegister.total_sales || 0)}</p>
            </div>
          )}
        </div>

        {/* Payment breakdown if available */}
        {cashRegister.totals_by_method && Object.keys(cashRegister.totals_by_method).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Vendas por método</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(cashRegister.totals_by_method).map(([method, total]: [string, any]) => {
                const config = PAYMENT_METHOD_LABELS[method] || { label: method, icon: DollarSign };
                const Icon = config.icon;
                return (
                  <div key={method} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{config.label}</p>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(total || 0)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => setShowCloseModal(true)}
        className="w-full py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors active:scale-95"
      >
        <span className="flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          Fechar Caixa
        </span>
      </button>

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCloseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Fechar Caixa</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Saldo de fechamento (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isClosing) handleClose(); }}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-lg font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observacoes (opcional)</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Alguma observacao sobre o fechamento..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClose}
                  disabled={isClosing}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 active:scale-95"
                >
                  {isClosing ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
