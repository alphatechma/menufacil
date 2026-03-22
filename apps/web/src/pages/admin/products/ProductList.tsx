import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  GripVertical,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  ToggleRight,
  ToggleLeft,
  DollarSign,
  X,
  Minus,
} from 'lucide-react';
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
  useBulkProductActionMutation,
} from '@/api/adminApi';
import { usePermission } from '@/hooks/usePermission';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';
import { useNotify } from '@/hooks/useNotify';

interface SortableRowProps {
  product: any;
  onDelete: (product: { id: string; name: string }) => void;
  categoriesMap: Record<string, string>;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

function SortableRow({ product, onDelete, categoriesMap, selected, onToggleSelect }: SortableRowProps) {
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
      className={cn(
        'hover:bg-muted/50 transition-colors',
        selected && 'bg-primary/5',
      )}
    >
      <td className="px-3 py-4 w-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(product.id);
          }}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [priceAdjustModal, setPriceAdjustModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'percent' | 'fixed'>('percent');
  const [adjustmentValue, setAdjustmentValue] = useState('');

  const notify = useNotify();
  const { hasPermission } = usePermission();
  const { data: products = [], isLoading } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [reorderProducts] = useReorderProductsMutation();
  const [bulkAction, { isLoading: isBulkLoading }] = useBulkProductActionMutation();

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
      notify.success('Produto excluido com sucesso!');
    } catch {
      notify.error('Erro ao excluir produto.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const allIds = filtered.map((p: any) => p.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleBulkActivate = async () => {
    try {
      await bulkAction({ action: 'activate', ids: selectedIds }).unwrap();
      notify.success(`${selectedIds.length} produto(s) ativado(s)!`);
      setSelectedIds([]);
    } catch {
      notify.error('Erro ao ativar produtos.');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await bulkAction({ action: 'deactivate', ids: selectedIds }).unwrap();
      notify.success(`${selectedIds.length} produto(s) desativado(s)!`);
      setSelectedIds([]);
    } catch {
      notify.error('Erro ao desativar produtos.');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkAction({ action: 'delete', ids: selectedIds }).unwrap();
      notify.success(`${selectedIds.length} produto(s) excluido(s)!`);
      setSelectedIds([]);
    } catch {
      notify.error('Erro ao excluir produtos.');
    } finally {
      setBulkDeleteConfirm(false);
    }
  };

  const handleBulkPriceAdjust = async () => {
    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) {
      notify.error('Informe um valor valido.');
      return;
    }
    try {
      await bulkAction({
        action: 'adjust_price',
        ids: selectedIds,
        value,
        adjustment_type: adjustmentType,
      }).unwrap();
      notify.success(`Preco de ${selectedIds.length} produto(s) atualizado!`);
      setSelectedIds([]);
      setPriceAdjustModal(false);
      setAdjustmentValue('');
    } catch {
      notify.error('Erro ao reajustar precos.');
    }
  };

  // Preview of price changes for selected products
  const pricePreview = useMemo(() => {
    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) return [];
    return products
      .filter((p: any) => selectedIds.includes(p.id))
      .map((p: any) => {
        const currentPrice = Number(p.base_price);
        let newPrice: number;
        if (adjustmentType === 'percent') {
          newPrice = currentPrice * (1 + value / 100);
        } else {
          newPrice = currentPrice + value;
        }
        newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
        return { name: p.name, currentPrice, newPrice };
      });
  }, [products, selectedIds, adjustmentType, adjustmentValue]);

  if (isLoading) return <ListPageSkeleton />;

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0;

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
                    <th className="w-10 px-3 py-4">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : someSelected ? (
                          <Minus className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
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
                        selected={selectedIds.includes(product.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {someSelected && hasPermission('product:update') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-6 py-3 text-white shadow-2xl">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.length} produto(s) selecionado(s)
          </span>
          <div className="w-px h-6 bg-gray-700" />
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-gray-800"
            onClick={handleBulkActivate}
            disabled={isBulkLoading}
          >
            <ToggleRight className="w-4 h-4" />
            <span className="ml-1">Ativar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-gray-800"
            onClick={handleBulkDeactivate}
            disabled={isBulkLoading}
          >
            <ToggleLeft className="w-4 h-4" />
            <span className="ml-1">Desativar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-gray-800"
            onClick={() => {
              setAdjustmentValue('');
              setAdjustmentType('percent');
              setPriceAdjustModal(true);
            }}
            disabled={isBulkLoading}
          >
            <DollarSign className="w-4 h-4" />
            <span className="ml-1">Reajustar Preco</span>
          </Button>
          {hasPermission('product:delete') && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:bg-red-900/30 hover:text-red-300"
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={isBulkLoading}
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-1">Excluir</span>
            </Button>
          )}
          <button
            onClick={() => setSelectedIds([])}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Single Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Excluir Produtos"
        message={`Tem certeza que deseja excluir ${selectedIds.length} produto(s)? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir Todos"
        loading={isBulkLoading}
      />

      {/* Price Adjustment Modal */}
      <Modal
        open={priceAdjustModal}
        onClose={() => setPriceAdjustModal(false)}
        title="Reajustar Precos"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ajuste o preco de {selectedIds.length} produto(s) selecionado(s).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Tipo de ajuste
              </label>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as 'percent' | 'fixed')}
              >
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Valor
              </label>
              <Input
                type="number"
                step={adjustmentType === 'percent' ? '1' : '0.01'}
                placeholder={adjustmentType === 'percent' ? 'Ex: 10 ou -5' : 'Ex: 2.50 ou -1.00'}
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Use valores negativos para reduzir o preco.
          </p>

          {/* Price preview */}
          {pricePreview.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Produto
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Atual
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Novo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pricePreview.map((item) => (
                    <tr key={item.name}>
                      <td className="px-3 py-2 text-foreground">{item.name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatPrice(item.currentPrice)}
                      </td>
                      <td className={cn(
                        'px-3 py-2 text-right font-medium',
                        item.newPrice > item.currentPrice ? 'text-red-600' : 'text-green-600',
                      )}>
                        {formatPrice(item.newPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPriceAdjustModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkPriceAdjust}
              disabled={!adjustmentValue || isBulkLoading}
              loading={isBulkLoading}
            >
              <DollarSign className="w-4 h-4" />
              <span className="ml-1">Aplicar Reajuste</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
