import { Handle, Position, type NodeProps } from '@xyflow/react';
import { List } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SendMenuNode({ data, selected }: NodeProps) {
  const title = (data.title as string) || 'Menu';
  const options = (data.options as Array<{ title: string }>) || [];

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-emerald-300 bg-emerald-50 shadow-sm p-3',
        selected && 'ring-2 ring-emerald-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <List className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700 uppercase">Menu</span>
      </div>
      <p className="text-xs text-emerald-800 font-medium">{title}</p>
      {options.length > 0 && (
        <p className="text-xs text-emerald-600 mt-1">{options.length} opcao(oes)</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  );
}
