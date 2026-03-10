import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export function LookupOrderNode({ data, selected }: NodeProps) {
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm p-3',
        selected && 'ring-2 ring-amber-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase">Consultar Pedido</span>
      </div>
      {typeof data.label === 'string' && data.label && <p className="text-xs text-amber-800">{data.label}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  );
}
