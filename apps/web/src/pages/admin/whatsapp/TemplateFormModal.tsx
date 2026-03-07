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

const PLACEHOLDERS = ['{{customer_name}}', '{{order_number}}', '{{total}}', '{{order_type}}', '{{storefront_url}}'];

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

  const previewText = contentValue
    ?.replace(/\{\{customer_name\}\}/g, 'Joao')
    .replace(/\{\{order_number\}\}/g, '42')
    .replace(/\{\{total\}\}/g, '59.90')
    .replace(/\{\{order_type\}\}/g, 'delivery')
    .replace(/\{\{storefront_url\}\}/g, 'menufacil.../restaurante');

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar Template' : 'Novo Template'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={control} name="name" label="Nome">
          {({ field }) => <Input {...field} placeholder="Nome do template" />}
        </FormField>

        <FormField control={control} name="type" label="Tipo">
          {({ field }) => (
            <Select {...field}>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField control={control} name="content" label="Conteudo">
          {({ field }) => <Textarea {...field} rows={4} placeholder="Digite a mensagem..." />}
        </FormField>

        <div className="text-xs text-muted-foreground">
          Variaveis disponiveis: {PLACEHOLDERS.map((p) => (
            <code key={p} className="bg-muted px-1 py-0.5 rounded mx-0.5">{p}</code>
          ))}
        </div>

        {contentValue && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-3">
            <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">Preview:</p>
            <p className="text-sm text-green-900 dark:text-green-100">{previewText}</p>
          </div>
        )}

        <FormField control={control} name="is_active" label="Ativo">
          {({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={creating || updating}>
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
