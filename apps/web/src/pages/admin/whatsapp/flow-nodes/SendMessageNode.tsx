import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SendMessageNode({ data, selected }: NodeProps) {
  const content = (data.content as string) || '';
  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content;

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-green-300 bg-green-50 shadow-sm p-3',
        selected && 'ring-2 ring-green-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-green-600" />
        <span className="text-xs font-semibold text-green-700 uppercase">Enviar Mensagem</span>
      </div>
      {preview && <p className="text-xs text-green-800 truncate">{preview}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  );
}
