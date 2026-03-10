import type { DragEvent } from 'react';
import { cn } from '@/utils/cn';

interface PaletteItem {
  type: string;
  label: string;
  defaultData: Record<string, unknown>;
}

interface PaletteCategory {
  title: string;
  color: string;
  items: PaletteItem[];
}

const CATEGORIES: PaletteCategory[] = [
  {
    title: 'Gatilhos',
    color: 'bg-blue-500',
    items: [
      { type: 'trigger', label: 'Mensagem Recebida', defaultData: { label: 'Mensagem Recebida', trigger_type: 'message_received', trigger_config: {} } },
      { type: 'trigger', label: 'Status do Pedido', defaultData: { label: 'Status do Pedido', trigger_type: 'order_status_changed', trigger_config: {} } },
      { type: 'trigger', label: 'Agendado', defaultData: { label: 'Agendado', trigger_type: 'scheduled', trigger_config: {} } },
      { type: 'trigger', label: 'Novo Cliente', defaultData: { label: 'Novo Cliente', trigger_type: 'new_customer', trigger_config: {} } },
    ],
  },
  {
    title: 'Acoes',
    color: 'bg-green-500',
    items: [
      { type: 'send_message', label: 'Enviar Mensagem', defaultData: { content: '' } },
      { type: 'send_media', label: 'Enviar Midia', defaultData: { media_url: '', caption: '' } },
      { type: 'send_menu_link', label: 'Enviar Cardapio', defaultData: { label: 'Link do cardapio' } },
      { type: 'delay', label: 'Delay', defaultData: { minutes: 1 } },
      { type: 'transfer_human', label: 'Transferir p/ Atendente', defaultData: {} },
    ],
  },
  {
    title: 'Logica',
    color: 'bg-amber-500',
    items: [
      { type: 'condition', label: 'Condicao', defaultData: { field: '', operator: 'eq', value: '' } },
      { type: 'check_hours', label: 'Verificar Horario', defaultData: {} },
      { type: 'check_customer', label: 'Verificar Cliente', defaultData: { check_type: 'is_registered' } },
      { type: 'lookup_order', label: 'Consultar Pedido', defaultData: { label: 'Consultar pedido' } },
    ],
  },
  {
    title: 'Input',
    color: 'bg-purple-500',
    items: [
      { type: 'wait_input', label: 'Aguardar Resposta', defaultData: { timeout_minutes: 5 } },
    ],
  },
];

interface NodePaletteProps {
  className?: string;
}

export function NodePalette({ className }: NodePaletteProps) {
  const onDragStart = (event: DragEvent, item: PaletteItem) => {
    const payload = JSON.stringify({ type: item.type, data: item.defaultData });
    event.dataTransfer.setData('application/reactflow', payload);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={cn('w-56 bg-white border-r border-border overflow-y-auto p-3 space-y-4', className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Componentes</h3>
      {CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-2 h-2 rounded-full', cat.color)} />
            <span className="text-xs font-semibold text-foreground">{cat.title}</span>
          </div>
          <div className="space-y-1">
            {cat.items.map((item) => (
              <div
                key={`${item.type}-${item.label}`}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                className="px-3 py-2 text-xs text-foreground bg-muted/50 rounded-lg cursor-grab hover:bg-muted transition-colors active:cursor-grabbing"
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
