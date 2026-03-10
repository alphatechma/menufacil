import { Handle, Position, type NodeProps } from '@xyflow/react';
import { UserPlus } from 'lucide-react';
import { cn } from '@/utils/cn';

export function TransferHumanNode({ selected }: NodeProps) {
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-red-300 bg-red-50 shadow-sm p-3',
        selected && 'ring-2 ring-red-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-4 h-4 text-red-600" />
        <span className="text-xs font-semibold text-red-700 uppercase">Transferir</span>
      </div>
      <p className="text-xs text-red-800">Transferir p/ Atendente</p>
    </div>
  );
}
