import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
} from 'lucide-react';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  category?: {
    id: string;
    name: string;
  };
  variations?: { id: string; name: string; price: number }[];
}

interface Category {
  id: string;
  name: string;
}

function SortableRow({
  product,
  formatPrice,
  onDelete,
}: {
  product: Product;
  formatPrice: (price: number) => string;
  onDelete: (id: string) => void;
}) {
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
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 transition-colors ${isDragging ? 'opacity-50 bg-blue-50' : ''}`}
    >
      <td className="px-2 py-3.5 w-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{product.name}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
        {product.category?.name || '--'}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
        {formatPrice(product.base_price)}
      </td>
      <td className="px-5 py-3.5 text-sm text-center text-gray-600 hidden lg:table-cell">
        {product.variations?.length || 0}
      </td>
      <td className="px-5 py-3.5 text-center">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            product.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {product.is_active ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          {product.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/products/${product.id}/edit`}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products/all');
      return response.data;
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories/all');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      api.put('/products/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const filtered = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || product.category?.id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isFiltering = search !== '' || categoryFilter !== '';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((p) => p.id === active.id);
    const newIndex = filtered.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder locally
    const reordered = [...filtered];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Assign new sort_order values
    const items = reordered.map((p, idx) => ({ id: p.id, sort_order: idx }));

    // Optimistic update
    queryClient.setQueryData<Product[]>(['products'], (old) => {
      if (!old) return old;
      const orderMap = new Map(items.map((i) => [i.id, i.sort_order]));
      return old
        .map((p) => ({
          ...p,
          sort_order: orderMap.has(p.id) ? orderMap.get(p.id)! : p.sort_order,
        }))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    });

    reorderMutation.mutate(items);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 mt-1">Gerencie os produtos do seu cardapio</p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro produto para comecar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-10 px-2 py-3" />
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Categoria
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preco
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Variacoes
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <SortableContext
                  items={filtered.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={isFiltering}
                >
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((product) => (
                      <SortableRow
                        key={product.id}
                        product={product}
                        formatPrice={formatPrice}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900">Excluir Produto</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Tem certeza que deseja excluir este produto? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
