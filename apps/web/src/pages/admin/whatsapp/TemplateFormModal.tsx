import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import {
  useCreateWhatsappTemplateMutation,
  useUpdateWhatsappTemplateMutation,
} from '@/api/adminApi';

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'order_confirmed', label: 'Pedido Confirmado' },
  { value: 'order_preparing', label: 'Em Preparo' },
  { value: 'order_ready', label: 'Pronto' },
  { value: 'order_out_for_delivery', label: 'Saiu para Entrega' },
  { value: 'order_delivered', label: 'Entregue' },
  { value: 'order_cancelled', label: 'Cancelado' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'custom', label: 'Personalizado' },
];

const PLACEHOLDER_GROUPS = [
  {
    label: 'Cliente & Pedido',
    items: [
      { key: '{{customer_name}}', desc: 'Nome do cliente' },
      { key: '{{order_number}}', desc: 'Numero do pedido' },
      { key: '{{total}}', desc: 'Valor total' },
      { key: '{{subtotal}}', desc: 'Subtotal' },
      { key: '{{delivery_fee}}', desc: 'Taxa de entrega' },
      { key: '{{discount}}', desc: 'Desconto' },
      { key: '{{order_type}}', desc: 'Tipo (delivery/pickup)' },
      { key: '{{payment_method}}', desc: 'Forma de pagamento' },
      { key: '{{items_list}}', desc: 'Lista de itens' },
      { key: '{{items_count}}', desc: 'Qtd de itens' },
      { key: '{{notes}}', desc: 'Observacoes' },
    ],
  },
  {
    label: 'Loja',
    items: [
      { key: '{{store_name}}', desc: 'Nome da loja' },
      { key: '{{store_phone}}', desc: 'Telefone' },
      { key: '{{store_address}}', desc: 'Endereco' },
      { key: '{{store_status}}', desc: 'Aberto/Fechado' },
      { key: '{{store_status_message}}', desc: 'Msg de status com horario' },
      { key: '{{store_hours_today}}', desc: 'Horario de hoje' },
      { key: '{{store_hours}}', desc: 'Todos os horarios' },
      { key: '{{storefront_url}}', desc: 'Link do cardapio' },
    ],
  },
];

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  type: z.string().min(1, 'Tipo obrigatorio'),
  content: z.string().min(1, 'Conteudo obrigatorio'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  template?: any;
}

export default function TemplateFormModal({ open, onClose, template }: Props) {
  const [create, { isLoading: creating }] = useCreateWhatsappTemplateMutation();
  const [update, { isLoading: updating }] = useUpdateWhatsappTemplateMutation();
  const isEditing = !!template;

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'custom', content: '', is_active: true },
  });

  useEffect(() => {
    if (template) {
      reset({ name: template.name, type: template.type, content: template.content, is_active: template.is_active });
    } else {
      reset({ name: '', type: 'custom', content: '', is_active: true });
    }
  }, [template, reset]);

  const contentValue = watch('content');

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await update({ id: template.id, data });
    } else {
      await create(data as any);
    }
    onClose();
  };

  const previewValues: Record<string, string> = {
    customer_name: 'Joao',
    order_number: '42',
    total: '59.90',
    subtotal: '52.90',
    delivery_fee: '7.00',
    discount: '0.00',
    order_type: 'delivery',
    payment_method: 'PIX',
    items_list: '• 2x Pizza Margherita (Grande)\n• 1x Coca-Cola 2L',
    items_count: '3',
    notes: 'Sem cebola',
    store_name: 'Pizzaria do Joao',
    store_phone: '(11) 99999-9999',
    store_address: 'Rua das Flores, 123',
    store_status: 'Aberto',
    store_status_message: '🟢 Estamos *abertos* hoje ate as 22:00!',
    store_hours_today: '09:00 - 22:00',
    store_hours: 'Seg-Sex: 09:00-22:00\nSab: 10:00-23:00\nDom: Fechado',
    storefront_url: 'menufacil.../restaurante',
    next_open: 'Abrimos amanha as 09:00.',
  };

  const previewText = contentValue?.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => previewValues[key] || `{{${key}}}`,
  );

  const insertPlaceholder = (key: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="content"]');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + key + val.substring(end);
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(textarea, newVal);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      textarea.setSelectionRange(start + key.length, start + key.length);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar Template' : 'Novo Template'} className="md:max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={control} name="name" label="Nome">
            {(field) => <Input {...field} placeholder="Nome do template" />}
          </FormField>
          <FormField control={control} name="type" label="Tipo">
            {(field) => (
              <Select {...field}>
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <FormField control={control} name="content" label="Conteudo">
              {(field) => <Textarea {...field} rows={6} placeholder="Digite a mensagem..." />}
            </FormField>
            <div className="space-y-1.5">
              {PLACEHOLDER_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{group.label}:</p>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        title={p.desc}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                        onClick={() => insertPlaceholder(p.key)}
                      >
                        <code>{p.key}</code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {contentValue && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-3 h-fit">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">Preview:</p>
              <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-line">{previewText}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <FormField control={control} name="is_active" label="Ativo">
            {(field) => <Toggle checked={field.value} onChange={field.onChange} />}
          </FormField>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={creating || updating}>
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
