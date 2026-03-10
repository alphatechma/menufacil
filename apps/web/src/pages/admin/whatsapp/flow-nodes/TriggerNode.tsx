import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-blue-300 bg-blue-50 shadow-sm p-3',
        selected && 'ring-2 ring-blue-500 ring-offset-2',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700 uppercase">Gatilho</span>
      </div>
      <p className="text-sm text-blue-900 font-medium">{data.label as string || 'Trigger'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
}
