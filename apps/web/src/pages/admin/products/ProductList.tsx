import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, GripVertical, Eye, EyeOff } from 'lucide-react';
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
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useDeleteProductMutation,
  useReorderProductsMutation,
} from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';
import { toast } from 'sonner';

interface SortableRowProps {
  product: any;
  onDelete: (product: { id: string; name: string }) => void;
  categoriesMap: Record<string, string>;
}

function SortableRow({ product, onDelete, categoriesMap }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="hover:bg-muted/50 transition-colors"
    >
      <td className="px-3 py-4 w-10">
        <button
          type="button"
          className="p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <span className="font-medium text-foreground">{product.name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {categoriesMap[product.category_id] ?? '-'}
      </td>
      <td className="px-6 py-4 text-sm text-foreground font-medium">
        {formatPrice(product.base_price)}
      </td>
      <td className="px-6 py-4">
        {product.is_active ? (
          <Badge variant="success">
            <Eye className="w-3 h-3 mr-1" />
            Ativo
          </Badge>
        ) : (
          <Badge variant="default">
            <EyeOff className="w-3 h-3 mr-1" />
            Inativo
          </Badge>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/admin/products/${product.id}/edit`}>
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={() => onDelete({ id: product.id, name: product.name })}
            className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductList() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: products = [], isLoading } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [reorderProducts] = useReorderProductsMutation();

  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat: any) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    let result = [...products];
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((p: any) => p.name?.toLowerCase().includes(term));
    }
    if (categoryFilter) {
      result = result.filter((p: any) => p.category_id === categoryFilter);
    }
    result.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return result;
  }, [products, search, categoryFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = filtered.findIndex((p: any) => p.id === active.id);
      const newIndex = filtered.findIndex((p: any) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(filtered, oldIndex, newIndex);
      const items = reordered.map((p: any, index: number) => ({
        id: p.id,
        sort_order: index,
      }));

      reorderProducts({ items });
    },
    [filtered, reorderProducts],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id).unwrap();
      toast.success('Produto excluido com sucesso!');
    } catch {
      toast.error('Erro ao excluir produto.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
        <Link to="/admin/products/new">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar produtos..."
          className="flex-1"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-56"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="Nenhum produto encontrado"
          description={
            search || categoryFilter
              ? 'Tente buscar com outros termos ou altere o filtro de categoria.'
              : 'Crie seu primeiro produto para comecar a vender.'
          }
          action={
            !search && !categoryFilter ? (
              <Link to="/admin/products/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Novo Produto
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-10 px-3 py-4" />
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Preco
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <SortableContext
                  items={filtered.map((p: any) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-border">
                    {filtered.map((product: any) => (
                      <SortableRow
                        key={product.id}
                        product={product}
                        onDelete={setDeleteTarget}
                        categoriesMap={categoriesMap}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
