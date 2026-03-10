import { Handle, Position, type NodeProps } from '@xyflow/react';
import { UserCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

const CHECK_TYPE_LABELS: Record<string, string> = {
  is_registered: 'Cadastrado?',
  has_recent_order: 'Pedido recente?',
  loyalty_points_gt: 'Pontos fidelidade >',
};

export function CheckCustomerNode({ data, selected }: NodeProps) {
  const checkType = (data.check_type as string) || 'is_registered';
  const label = CHECK_TYPE_LABELS[checkType] || checkType;

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm p-3 relative',
        selected && 'ring-2 ring-amber-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <UserCheck className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase">Verificar Cliente</span>
      </div>
      <p className="text-xs text-amber-800">{label}</p>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-2">
        <span className="text-green-600 font-medium">Sim</span>
        <span className="text-red-600 font-medium">Nao</span>
      </div>
      <Handle
        type="source"
        id="true"
        position={Position.Bottom}
        style={{ left: '30%' }}
        className="!bg-green-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        id="false"
        position={Position.Bottom}
        style={{ left: '70%' }}
        className="!bg-red-500 !w-3 !h-3"
      />
    </div>
  );
}
