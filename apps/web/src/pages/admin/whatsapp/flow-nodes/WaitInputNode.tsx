import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export function WaitInputNode({ data, selected }: NodeProps) {
  const timeout = (data.timeout_minutes as number) || 5;

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-purple-300 bg-purple-50 shadow-sm p-3',
        selected && 'ring-2 ring-purple-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700 uppercase">Aguardar Resposta</span>
      </div>
      <p className="text-xs text-purple-800">Timeout: {timeout} min</p>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
}
