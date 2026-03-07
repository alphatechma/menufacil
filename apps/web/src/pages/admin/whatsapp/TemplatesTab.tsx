import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useGetWhatsappTemplatesQuery,
  useUpdateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
} from '@/api/adminApi';
import TemplateFormModal from './TemplateFormModal';

const TYPE_LABELS: Record<string, string> = {
  welcome: 'Boas-vindas',
  order_confirmed: 'Pedido Confirmado',
  order_preparing: 'Em Preparo',
  order_ready: 'Pronto',
  order_out_for_delivery: 'Saiu p/ Entrega',
  order_delivered: 'Entregue',
  order_cancelled: 'Cancelado',
  marketing: 'Marketing',
  custom: 'Personalizado',
};

const TYPE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  welcome: 'info',
  order_confirmed: 'success',
  order_preparing: 'warning',
  order_ready: 'success',
  order_out_for_delivery: 'info',
  order_delivered: 'success',
  order_cancelled: 'danger',
  marketing: 'default',
  custom: 'default',
};

export default function TemplatesTab() {
  const { data: templates, isLoading } = useGetWhatsappTemplatesQuery();
  const [updateTemplate] = useUpdateWhatsappTemplateMutation();
  const [deleteTemplate] = useDeleteWhatsappTemplateMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {!templates?.length ? (
        <EmptyState title="Nenhum template" description="Crie templates para mensagens automaticas." />
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground text-sm">{t.name}</h3>
                    <Badge variant={TYPE_VARIANTS[t.type] || 'default'}>
                      {TYPE_LABELS[t.type] || t.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{t.content}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle
                    checked={t.is_active}
                    onChange={(checked) => updateTemplate({ id: t.id, data: { is_active: checked } })}
                  />
                  <button
                    onClick={() => { setEditingTemplate(t); setFormOpen(true); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(t.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTemplate(null); }}
        template={editingTemplate}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteTemplate(deleteConfirm); setDeleteConfirm(null); }}
        title="Excluir Template"
        message="Tem certeza que deseja excluir este template?"
      />
    </div>
  );
}
