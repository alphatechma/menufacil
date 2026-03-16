import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/utils/cn';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  pix_qrcode: 'PIX QR Code',
  pix_copy_paste: 'PIX Copia e Cola',
  payment_link: 'Link de Pagamento',
  boleto: 'Boleto',
};

export function SendPaymentNode({ data, selected }: NodeProps) {
  const paymentType = (data.payment_type as string) || '';
  const label = PAYMENT_TYPE_LABELS[paymentType] || 'Pagamento';
  const content = (data.content as string) || '';
  const preview = content.length > 50 ? content.slice(0, 50) + '...' : content;

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-emerald-300 bg-emerald-50 shadow-sm p-3',
        selected && 'ring-2 ring-emerald-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700 uppercase">{label}</span>
      </div>
      {preview && <p className="text-xs text-emerald-800 truncate">{preview}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  );
}
