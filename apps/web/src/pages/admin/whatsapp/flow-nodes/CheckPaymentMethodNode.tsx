import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/utils/cn';

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao Credito',
  debit_card: 'Cartao Debito',
  cash: 'Dinheiro',
};

export function CheckPaymentMethodNode({ data, selected }: NodeProps) {
  const method = (data.payment_method as string) || 'pix';

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm p-3',
        selected && 'ring-2 ring-amber-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase">Pagamento = {METHOD_LABELS[method] || method}</span>
      </div>
      <div className="flex justify-between text-[10px] text-amber-600 mt-2">
        <span>Sim</span>
        <span>Nao</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500 !w-3 !h-3" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-400 !w-3 !h-3" style={{ left: '70%' }} />
    </div>
  );
}
