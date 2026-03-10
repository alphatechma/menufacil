import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

export function CheckHoursNode({ selected }: NodeProps) {
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm p-3 relative',
        selected && 'ring-2 ring-amber-500 ring-offset-2',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase">Verificar Horario</span>
      </div>
      <p className="text-xs text-amber-800">Loja aberta?</p>
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
