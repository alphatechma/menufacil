import type { Node } from '@xyflow/react';
import { Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { useGetWhatsappTemplatesQuery } from '@/api/adminApi';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  className?: string;
}

const CONDITION_FIELDS = [
  { value: 'store_status', label: 'Status da loja' },
  { value: 'last_input', label: 'Ultima resposta' },
  { value: 'customer.is_registered', label: 'Cliente cadastrado' },
  { value: 'customer.loyalty_points', label: 'Pontos de fidelidade' },
  { value: 'last_order.total', label: 'Total do pedido' },
  { value: 'last_order.status', label: 'Status do pedido' },
  { value: 'current_hour', label: 'Hora atual' },
  { value: 'current_day', label: 'Dia da semana' },
];

const CONDITION_OPERATORS = [
  { value: 'eq', label: 'Igual a' },
  { value: 'neq', label: 'Diferente de' },
  { value: 'gt', label: 'Maior que' },
  { value: 'lt', label: 'Menor que' },
  { value: 'contains', label: 'Contem' },
  { value: 'not_contains', label: 'Nao contem' },
];

const CHECK_TYPES = [
  { value: 'is_registered', label: 'Cadastrado' },
  { value: 'has_recent_order', label: 'Pedido recente' },
  { value: 'loyalty_points_gt', label: 'Pontos fidelidade maior que' },
];

const NODE_TITLES: Record<string, string> = {
  trigger: 'Gatilho',
  send_message: 'Enviar Mensagem',
  send_media: 'Enviar Midia',
  send_menu_link: 'Enviar Cardapio',
  delay: 'Delay',
  wait_input: 'Aguardar Resposta',
  condition: 'Condicao',
  check_hours: 'Verificar Horario',
  check_customer: 'Verificar Cliente',
  lookup_order: 'Consultar Pedido',
  transfer_human: 'Transferir p/ Atendente',
  send_menu: 'Menu Interativo',
  send_payment: 'Enviar Pagamento',
};

function SendMessageConfig({ data, updateData }: { data: Record<string, any>; updateData: (key: string, value: unknown) => void }) {
  const { data: templates } = useGetWhatsappTemplatesQuery();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Usar template salvo</label>
        <Select
          value=""
          onChange={(e) => {
            const tpl = templates?.find((t: any) => t.id === e.target.value);
            if (tpl) {
              updateData('content', tpl.content);
            }
          }}
        >
          <option value="">Selecionar template...</option>
          {templates?.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Conteudo da mensagem</label>
        <Textarea
          rows={6}
          value={(data.content as string) || ''}
          onChange={(e) => updateData('content', e.target.value)}
          placeholder="Digite a mensagem ou selecione um template..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Variaveis: {'{{customer_name}}'}, {'{{order_number}}'}, {'{{total}}'}, {'{{store_name}}'}, {'{{store_hours_today}}'}, {'{{items_list}}'}
        </p>
      </div>
    </div>
  );
}

interface MenuOption {
  id: string;
  title: string;
  description: string;
}

function SendMenuConfig({ data, updateData }: { data: Record<string, any>; updateData: (key: string, value: unknown) => void }) {
  const options = (data.options as MenuOption[]) || [];

  const addOption = () => {
    const newOption: MenuOption = {
      id: `opt_${Date.now()}`,
      title: '',
      description: '',
    };
    updateData('options', [...options, newOption]);
  };

  const updateOption = (index: number, field: keyof MenuOption, value: string) => {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt,
    );
    updateData('options', updated);
  };

  const removeOption = (index: number) => {
    updateData('options', options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Titulo do menu</label>
        <Input
          value={(data.title as string) || ''}
          onChange={(e) => updateData('title', e.target.value)}
          placeholder="Ex: Menu de opcoes"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Descricao</label>
        <Textarea
          rows={2}
          value={(data.description as string) || ''}
          onChange={(e) => updateData('description', e.target.value)}
          placeholder="Selecione uma das opcoes abaixo:"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Texto do botao</label>
        <Input
          value={(data.button_text as string) || 'Ver opcoes'}
          onChange={(e) => updateData('button_text', e.target.value)}
          placeholder="Ver opcoes"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Timeout (minutos)</label>
        <Input
          type="number"
          min={1}
          value={(data.timeout_minutes as number) || 5}
          onChange={(e) => updateData('timeout_minutes', parseInt(e.target.value) || 5)}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">Opcoes do menu</label>
          <button
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma opcao adicionada.</p>
        )}
        <div className="space-y-3">
          {options.map((opt, index) => (
            <div key={opt.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Opcao {index + 1}</span>
                <button
                  onClick={() => removeOption(index)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <Input
                value={opt.title}
                onChange={(e) => updateOption(index, 'title', e.target.value)}
                placeholder="Titulo da opcao"
                className="text-xs"
              />
              <Input
                value={opt.description}
                onChange={(e) => updateOption(index, 'description', e.target.value)}
                placeholder="Descricao (opcional)"
                className="text-xs"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Apos o cliente selecionar, a resposta ficara disponivel em {'{{last_input}}'}.
        </p>
      </div>
    </div>
  );
}

export function NodeConfigPanel({ selectedNode, onUpdateNode, onClose, className }: NodeConfigPanelProps) {
  if (!selectedNode) return null;

  const nodeType = selectedNode.type || '';
  const data = selectedNode.data as Record<string, any>;

  const updateData = (key: string, value: unknown) => {
    onUpdateNode(selectedNode.id, { ...data, [key]: value });
  };

  const updateNestedData = (parentKey: string, key: string, value: unknown) => {
    const parent = (data[parentKey] as Record<string, unknown>) || {};
    onUpdateNode(selectedNode.id, { ...data, [parentKey]: { ...parent, [key]: value } });
  };

  const renderConfig = () => {
    switch (nodeType) {
      case 'trigger': {
        const triggerType = (data.trigger_type as string) || 'message_received';
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de gatilho</label>
              <Select
                value={triggerType}
                onChange={(e) => updateData('trigger_type', e.target.value)}
              >
                <option value="message_received">Mensagem recebida</option>
                <option value="order_status_changed">Status do pedido alterado</option>
                <option value="scheduled">Agendado</option>
                <option value="new_customer">Novo cliente</option>
              </Select>
            </div>
            {triggerType === 'message_received' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Palavras-chave (separadas por virgula)
                </label>
                <Input
                  value={(data.trigger_config as any)?.keywords?.join(', ') || ''}
                  onChange={(e) =>
                    updateNestedData(
                      'trigger_config',
                      'keywords',
                      e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean),
                    )
                  }
                  placeholder="oi, ola, menu"
                />
              </div>
            )}
            {triggerType === 'scheduled' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Cron expression</label>
                <Input
                  value={(data.trigger_config as any)?.cron || ''}
                  onChange={(e) => updateNestedData('trigger_config', 'cron', e.target.value)}
                  placeholder="0 9 * * *"
                />
              </div>
            )}
            {triggerType === 'order_status_changed' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Status (separados por virgula)</label>
                <Input
                  value={(data.trigger_config as any)?.statuses?.join(', ') || ''}
                  onChange={(e) =>
                    updateNestedData(
                      'trigger_config',
                      'statuses',
                      e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder="confirmed, preparing, ready"
                />
              </div>
            )}
          </div>
        );
      }

      case 'send_message':
        return <SendMessageConfig data={data} updateData={updateData} />;

      case 'send_media':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">URL da midia</label>
              <Input
                value={(data.media_url as string) || ''}
                onChange={(e) => updateData('media_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Legenda</label>
              <Textarea
                rows={3}
                value={(data.caption as string) || ''}
                onChange={(e) => updateData('caption', e.target.value)}
                placeholder="Legenda da midia..."
              />
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Minutos de espera</label>
              <Input
                type="number"
                min={1}
                value={(data.minutes as number) || 1}
                onChange={(e) => updateData('minutes', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        );

      case 'wait_input':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Timeout (minutos)</label>
              <Input
                type="number"
                min={1}
                value={(data.timeout_minutes as number) || 5}
                onChange={(e) => updateData('timeout_minutes', parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Campo</label>
              <Select
                value={(data.field as string) || ''}
                onChange={(e) => updateData('field', e.target.value)}
              >
                <option value="">Selecionar...</option>
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Operador</label>
              <Select
                value={(data.operator as string) || 'eq'}
                onChange={(e) => updateData('operator', e.target.value)}
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor</label>
              <Input
                value={(data.value as string) || ''}
                onChange={(e) => updateData('value', e.target.value)}
                placeholder="Valor para comparacao"
              />
            </div>
          </div>
        );

      case 'check_customer': {
        const checkType = (data.check_type as string) || 'is_registered';
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de verificacao</label>
              <Select
                value={checkType}
                onChange={(e) => updateData('check_type', e.target.value)}
              >
                {CHECK_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </Select>
            </div>
            {checkType === 'loyalty_points_gt' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Valor minimo de pontos</label>
                <Input
                  type="number"
                  min={0}
                  value={(data.value as number) || 0}
                  onChange={(e) => updateData('value', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        );
      }

      case 'send_menu':
        return <SendMenuConfig data={data} updateData={updateData} />;

      case 'send_payment': {
        const paymentType = (data.payment_type as string) || 'pix_qrcode';
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de pagamento</label>
              <Select
                value={paymentType}
                onChange={(e) => updateData('payment_type', e.target.value)}
              >
                <option value="pix_qrcode">PIX QR Code</option>
                <option value="pix_copy_paste">PIX Copia e Cola</option>
                <option value="payment_link">Link de Pagamento</option>
                <option value="boleto">Boleto</option>
              </Select>
            </div>
            {(paymentType === 'pix_qrcode' || paymentType === 'pix_copy_paste') && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Chave PIX</label>
                <Input
                  value={(data.pix_key as string) || ''}
                  onChange={(e) => updateData('pix_key', e.target.value)}
                  placeholder="CPF, CNPJ, email ou chave aleatoria"
                />
              </div>
            )}
            {paymentType === 'payment_link' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">URL do pagamento</label>
                <Input
                  value={(data.payment_url as string) || ''}
                  onChange={(e) => updateData('payment_url', e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{order_number}}'} e {'{{total}}'} na URL se suportado pelo gateway.
                </p>
              </div>
            )}
            {paymentType === 'boleto' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">URL do boleto</label>
                <Input
                  value={(data.payment_url as string) || ''}
                  onChange={(e) => updateData('payment_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mensagem personalizada</label>
              <Textarea
                rows={4}
                value={(data.content as string) || ''}
                onChange={(e) => updateData('content', e.target.value)}
                placeholder="Mensagem enviada junto com os dados de pagamento..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variaveis: {'{{customer_name}}'}, {'{{order_number}}'}, {'{{total}}'}, {'{{pix_key}}'}, {'{{payment_url}}'}
              </p>
            </div>
          </div>
        );
      }

      case 'check_hours':
      case 'lookup_order':
      case 'send_menu_link':
      case 'transfer_human':
        return (
          <p className="text-sm text-muted-foreground">
            Este componente nao possui configuracoes adicionais.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('w-80 bg-white border-l border-border overflow-y-auto', className)}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {NODE_TITLES[nodeType] || 'Configuracao'}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">{renderConfig()}</div>
    </div>
  );
}
