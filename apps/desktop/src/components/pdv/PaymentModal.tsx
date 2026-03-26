import {
  Plus,
  X,
  QrCode,
  CreditCard,
  Banknote,
  Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import type { PaymentSplit } from './types';
import { PAYMENT_METHODS } from './types';

const PAYMENT_ICONS = {
  pix: QrCode,
  credit_card: CreditCard,
  debit_card: CreditCard,
  cash: Banknote,
} as const;

interface PaymentSectionProps {
  paymentSplits: PaymentSplit[];
  onUpdateSplit: (index: number, field: string, value: any) => void;
  onAddSplit: () => void;
  onRemoveSplit: (index: number) => void;
  total: number;
  itemCount: number;
  changeFor: string;
  onChangeForUpdate: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  isPix: boolean;
  pixQrUrl: string | null;
  pixPayloadStr: string;
  pixKey: string | undefined;
  onSubmit: () => void;
  creating: boolean;
  cartEmpty: boolean;
}

export default function PaymentSection({
  paymentSplits,
  onUpdateSplit,
  onAddSplit,
  onRemoveSplit,
  total,
  itemCount,
  changeFor,
  onChangeForUpdate,
  notes,
  onNotesChange,
  isPix,
  pixQrUrl,
  pixPayloadStr,
  pixKey,
  onSubmit,
  creating,
  cartEmpty,
}: PaymentSectionProps) {
  return (
    <div className="border-t border-gray-100 bg-white">
      {/* Payment Methods */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Pagamento
          </p>
          {paymentSplits.length < 4 && (
            <button
              onClick={onAddSplit}
              className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 font-medium transition-colors"
            >
              <Plus className="w-3 h-3" /> Dividir
            </button>
          )}
        </div>

        {paymentSplits.map((split, index) => (
          <div key={index} className="mb-3 last:mb-0">
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = PAYMENT_ICONS[m.value];
                const isActive = split.method === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => onUpdateSplit(index, 'method', m.value)}
                    className={cn(
                      'flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all active:scale-95',
                      isActive
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                    <span className="text-[9px] text-gray-400 font-normal">
                      {m.shortcut}
                    </span>
                  </button>
                );
              })}
              {paymentSplits.length > 1 && (
                <button
                  onClick={() => onRemoveSplit(index)}
                  className="text-gray-300 hover:text-red-500 px-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {paymentSplits.length > 1 && (
              <input
                type="number"
                value={split.amount || ''}
                onChange={(e) =>
                  onUpdateSplit(index, 'amount', parseFloat(e.target.value) || 0)
                }
                placeholder="Valor"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 mt-2 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            )}
          </div>
        ))}

        {/* Cash: amount received + change */}
        {paymentSplits.some((s) => s.method === 'cash') && (
          <div className="mt-3 bg-success/5 border border-success/20 rounded-xl p-4 space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Valor recebido (R$)
              </label>
              <input
                type="number"
                value={changeFor}
                onChange={(e) => onChangeForUpdate(e.target.value)}
                placeholder={total.toFixed(2)}
                className="w-full px-4 py-2.5 rounded-xl border border-success/30 bg-white text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success/20 transition-all"
              />
            </div>
            {changeFor && parseFloat(changeFor) >= total && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-success">Troco</span>
                <span className="text-lg font-bold text-success">
                  {formatPrice(parseFloat(changeFor) - total)}
                </span>
              </div>
            )}
            {changeFor &&
              parseFloat(changeFor) > 0 &&
              parseFloat(changeFor) < total && (
                <p className="text-xs text-danger font-medium px-1">
                  Valor insuficiente (faltam{' '}
                  {formatPrice(total - parseFloat(changeFor))})
                </p>
              )}
          </div>
        )}

        {/* PIX QR Code */}
        {isPix && (
          <div className="mt-3 bg-primary-50 border border-primary/20 rounded-xl p-4 text-center">
            {pixQrUrl ? (
              <>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  QR Code PIX — {formatPrice(total)}
                </p>
                <img
                  src={pixQrUrl}
                  alt="PIX QR Code"
                  className="mx-auto w-44 h-44 rounded-xl shadow-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixPayloadStr);
                  }}
                  className="mt-3 text-xs text-primary hover:text-primary-dark font-medium underline underline-offset-2 transition-colors"
                >
                  Copiar código PIX
                </button>
              </>
            ) : pixKey ? (
              <p className="text-sm text-gray-500 font-medium py-4">
                Gerando QR Code...
              </p>
            ) : (
              <p className="text-sm text-danger font-medium py-4">
                Configure a chave PIX em Configurações {'>'} Pagamento
              </p>
            )}
          </div>
        )}
      </div>

      {/* Order Notes */}
      <div className="px-4 py-3 border-b border-gray-100">
        <input
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Observação do pedido..."
          className="w-full text-sm text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Totals + Submit */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-extrabold text-primary">
              {formatPrice(total)}
            </p>
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={creating || cartEmpty}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-base shadow-sm shadow-primary/30"
        >
          {creating ? (
            <span className="text-base">Finalizando...</span>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>Finalizar Pedido</span>
              <span className="text-xs opacity-75 ml-1">(F2)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
