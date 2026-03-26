import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderTree, Eye, EyeOff, GripVertical } from 'lucide-react';
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
import { useGetCategoriesQuery, useDeleteCategoryMutation, useUpdateCategoryMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useNotify } from '@/hooks/useNotify';

export default function CategoryList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const notify = useNotify();
  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter(
      (cat: any) =>
        cat.name?.toLowerCase().includes(term) ||
        cat.description?.toLowerCase().includes(term),
    );
  }, [categories, search]);

  const isSearching = search.trim().length > 0;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((c: any) => c.id === active.id);
    const newIndex = filtered.findIndex((c: any) => c.id === over.id);
    const reordered = arrayMove([...filtered], oldIndex, newIndex);

    try {
      await Promise.all(
        reordered.map((cat: any, index: number) =>
          updateCategory({ id: cat.id, data: { sort_order: index } }).unwrap(),
        ),
      );
      notify.success('Ordem atualizada!');
    } catch {
      notify.error('Erro ao atualizar ordem.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id).unwrap();
      notify.success('Categoria excluida com sucesso!');
    } catch {
      notify.error('Erro ao excluir categoria.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
        <Link to="/admin/categories/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar categorias..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="w-12 h-12" />}
          title="Nenhuma categoria encontrada"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Crie sua primeira categoria para organizar seus produtos.'
          }
          action={
            !search ? (
              <Link to="/admin/categories/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Nova Categoria
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border">
                {filtered.map((cat: any) => (
                  <SortableCategoryRow
                    key={cat.id}
                    category={cat}
                    disableDrag={isSearching}
                    onDelete={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}

function SortableCategoryRow({ category, disableDrag, onDelete }: {
  category: any;
  disableDrag: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id, disabled: disableDrag });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
      {!disableDrag && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FolderTree className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{category.name}</span>
            {category.is_active ? (
              <Badge variant="success">
                <Eye className="w-3 h-3 mr-1" />
                Ativa
              </Badge>
            ) : (
              <Badge variant="default">
                <EyeOff className="w-3 h-3 mr-1" />
                Inativa
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground truncate">{category.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link to={`/admin/categories/${category.id}/edit`}>
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </Link>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
