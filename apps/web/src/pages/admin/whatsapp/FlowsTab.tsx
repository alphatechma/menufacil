import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Copy, Workflow } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useGetWhatsappFlowsQuery,
  useCreateWhatsappFlowMutation,
  useUpdateWhatsappFlowMutation,
  useDeleteWhatsappFlowMutation,
  useDuplicateWhatsappFlowMutation,
} from '@/api/adminApi';

const TRIGGER_LABELS: Record<string, string> = {
  message_received: 'Mensagem Recebida',
  order_status_changed: 'Status do Pedido',
  scheduled: 'Agendado',
  new_customer: 'Novo Cliente',
};

const TRIGGER_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  message_received: 'info',
  order_status_changed: 'success',
  scheduled: 'warning',
  new_customer: 'default',
};

export default function FlowsTab() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { data: flows, isLoading } = useGetWhatsappFlowsQuery();
  const [createFlow, { isLoading: isCreating }] = useCreateWhatsappFlowMutation();
  const [updateFlow] = useUpdateWhatsappFlowMutation();
  const [deleteFlow, { isLoading: isDeleting }] = useDeleteWhatsappFlowMutation();
  const [duplicateFlow] = useDuplicateWhatsappFlowMutation();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const result = await createFlow({
        name: 'Novo Fluxo',
        trigger_type: 'message_received',
        trigger_config: {},
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: {
              label: 'Mensagem Recebida',
              trigger_type: 'message_received',
              trigger_config: {},
            },
          },
        ],
        edges: [],
      }).unwrap();
      navigate(`/admin/whatsapp/flows/${result.id}`);
    } catch {
      notify.error('Erro ao criar fluxo');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateFlow(id).unwrap();
      notify.success('Fluxo duplicado com sucesso');
    } catch {
      notify.error('Erro ao duplicar fluxo');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFlow(deleteConfirm).unwrap();
      notify.success('Fluxo excluido');
      setDeleteConfirm(null);
    } catch {
      notify.error('Erro ao excluir fluxo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} loading={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fluxo
        </Button>
      </div>

      {!flows?.length ? (
        <EmptyState
          icon={<Workflow className="w-8 h-8" />}
          title="Nenhum fluxo criado"
          description="Crie fluxos automatizados para interagir com seus clientes via WhatsApp."
        />
      ) : (
        <div className="space-y-3">
          {flows.map((flow: any) => (
            <Card key={flow.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground text-sm">{flow.name}</h3>
                    <Badge variant={TRIGGER_VARIANTS[flow.trigger_type] || 'default'}>
                      {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flow.nodes?.length || 0} etapas
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle
                    checked={flow.is_active}
                    onChange={(checked) =>
                      updateFlow({ id: flow.id, data: { is_active: checked } })
                    }
                  />
                  <button
                    onClick={() => navigate(`/admin/whatsapp/flows/${flow.id}`)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(flow.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(flow.id)}
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

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Excluir Fluxo"
        message="Tem certeza que deseja excluir este fluxo? Esta acao nao pode ser desfeita."
        loading={isDeleting}
      />
    </div>
  );
}
