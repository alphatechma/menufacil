import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import {
  useGetExtraGroupsQuery,
  useCreateExtraGroupMutation,
  useUpdateExtraGroupMutation,
  useDeleteExtraGroupMutation,
} from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { PriceInput } from '@/components/ui/PriceInput';

interface ExtraFormData {
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  extras: { name: string; price: number }[];
}

const emptyForm: ExtraFormData = {
  name: '',
  min_select: 0,
  max_select: 1,
  is_required: false,
  extras: [{ name: '', price: 0 }],
};

export default function ExtraGroupList() {
  const { data: groups, isLoading } = useGetExtraGroupsQuery();
  const [createGroup, { isLoading: isCreating }] = useCreateExtraGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateExtraGroupMutation();
  const [deleteGroup] = useDeleteExtraGroupMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ExtraFormData>(emptyForm);

  const isSaving = isCreating || isUpdating;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (group: any) => {
    setEditingId(group.id);
    setForm({
      name: group.name,
      min_select: group.min_select ?? 0,
      max_select: group.max_select ?? 1,
      is_required: group.is_required ?? false,
      extras: group.extras?.length
        ? group.extras.map((e: any) => ({ name: e.name, price: Number(e.price) }))
        : [{ name: '', price: 0 }],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do grupo.');
      return;
    }
    const validExtras = form.extras.filter((e) => e.name.trim());
    if (validExtras.length === 0) {
      toast.error('Adicione ao menos um extra.');
      return;
    }

    try {
      const payload = { ...form, extras: validExtras };
      if (editingId) {
        await updateGroup({ id: editingId, data: payload }).unwrap();
        toast.success('Grupo atualizado!');
      } else {
        await createGroup(payload).unwrap();
        toast.success('Grupo criado!');
      }
      setShowModal(false);
    } catch {
      toast.error('Erro ao salvar grupo.');
    }
  };

  const handleExtraDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);
      setForm({ ...form, extras: arrayMove(form.extras, oldIndex, newIndex) });
    }
  };

  const addExtra = () => {
    setForm({ ...form, extras: [...form.extras, { name: '', price: 0 }] });
  };

  const removeExtra = (index: number) => {
    setForm({ ...form, extras: form.extras.filter((_, i) => i !== index) });
  };

  const updateExtra = (index: number, field: 'name' | 'price', value: string | number) => {
    const updated = [...form.extras];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, extras: updated });
  };

  return (
    <>
      <PageHeader
        title="Grupos de Extras"
        backTo="/admin/products"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : !groups?.length ? (
          <EmptyState
            title="Nenhum grupo de extras"
            description="Crie grupos como 'Adicionais', 'Molhos', etc. e adicione os itens de cada grupo."
          />
        ) : (
          <div className="divide-y divide-border">
            {groups.map((group: any) => (
              <div key={group.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{group.name}</span>
                      {group.is_required && <Badge variant="warning">Obrigatorio</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.extras?.length || 0} extra(s) · Min: {group.min_select} · Max: {group.max_select}
                    </p>
                    {group.extras?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.extras.map((e: any) => `${e.name} (R$ ${Number(e.price).toFixed(2)})`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(group.id)}>
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Editar Grupo de Extras' : 'Novo Grupo de Extras'}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome do Grupo *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Adicionais, Molhos, Coberturas..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Min. selecoes</label>
              <Input
                type="number"
                min={0}
                value={form.min_select}
                onChange={(e) => setForm({ ...form, min_select: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Max. selecoes</label>
              <Input
                type="number"
                min={1}
                value={form.max_select}
                onChange={(e) => setForm({ ...form, max_select: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Toggle
              checked={form.is_required}
              onChange={(val) => setForm({ ...form, is_required: val, min_select: val ? Math.max(form.min_select, 1) : form.min_select })}
            />
            <span className="text-sm text-foreground">Obrigatorio</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">Itens do Grupo</label>
              <Button type="button" variant="outline" size="sm" onClick={addExtra}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExtraDragEnd}>
              <SortableContext items={form.extras.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {form.extras.map((extra, index) => (
                    <SortableExtraItem
                      key={index}
                      id={index}
                      extra={extra}
                      index={index}
                      canRemove={form.extras.length > 1}
                      onUpdate={updateExtra}
                      onRemove={removeExtra}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editingId ? 'Salvar' : 'Criar Grupo'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteGroup(deleteId).unwrap();
              toast.success('Grupo excluido!');
            } catch {
              toast.error('Erro ao excluir grupo.');
            }
          }
          setDeleteId(null);
        }}
        title="Excluir grupo de extras"
        message="Tem certeza? Os extras deste grupo serao removidos dos produtos associados."
      />
    </>
  );
}

function SortableExtraItem({ id, extra, index, canRemove, onUpdate, onRemove }: {
  id: number;
  extra: { name: string; price: number };
  index: number;
  canRemove: boolean;
  onUpdate: (index: number, field: 'name' | 'price', value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1">
        <Input
          value={extra.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder="Nome do extra"
        />
      </div>
      <div className="w-28">
        <PriceInput
          value={extra.price}
          onChange={(e) => onUpdate(index, 'price', Number(e.target.value))}
          placeholder="0.00"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
