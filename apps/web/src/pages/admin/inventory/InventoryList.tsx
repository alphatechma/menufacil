import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, AlertTriangle, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { useGetInventoryItemsQuery, useGetLowStockItemsQuery, useDeleteInventoryItemMutation, useCreateStockMovementMutation } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';

export default function InventoryList() {
  const navigate = useNavigate();
  const { data: items = [] } = useGetInventoryItemsQuery();
  const { data: lowStock = [] } = useGetLowStockItemsQuery();
  const [deleteItem] = useDeleteInventoryItemMutation();
  const [createMovement] = useCreateStockMovementMutation();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [movementModal, setMovementModal] = useState<{ item: any; type: 'entry' | 'exit' | 'adjustment' } | null>(null);
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movCost, setMovCost] = useState('');

  const categories = [...new Set(items.map((i: any) => i.category).filter(Boolean))];

  const filtered = items.filter((i: any) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    return true;
  });

  const handleMovement = async () => {
    if (!movementModal || !movQty) return;
    await createMovement({
      item_id: movementModal.item.id,
      type: movementModal.type,
      quantity: parseFloat(movQty),
      unit_cost: movCost ? parseFloat(movCost) : undefined,
      reason: movReason || undefined,
    }).unwrap();
    setMovementModal(null);
    setMovQty('');
    setMovReason('');
    setMovCost('');
  };

  const lowStockIds = new Set(lowStock.map((i: any) => i.id));

  return (
    <>
      <PageHeader
        title="Estoque & Insumos"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/inventory/movements')}>
              <RefreshCw className="w-4 h-4 mr-2" /> Movimentacoes
            </Button>
            <Button onClick={() => navigate('/admin/inventory/new')}>
              <Plus className="w-4 h-4 mr-2" /> Novo Insumo
            </Button>
          </div>
        }
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="p-4 mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800 dark:text-amber-200">Estoque Baixo ({lowStock.length} itens)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item: any) => (
              <Badge key={item.id} variant="warning" className="text-xs">
                {item.name}: {Number(item.current_stock).toFixed(1)} {item.unit} (min: {Number(item.min_stock).toFixed(1)})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar insumo..." />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground"
          >
            <option value="">Todas categorias</option>
            {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Insumo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Estoque</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Min.</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custo Unit.</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => {
                const isLow = lowStockIds.has(item.id);
                return (
                  <tr key={item.id} className={cn('border-b border-border/50 hover:bg-muted/30', isLow && 'bg-amber-50/50 dark:bg-amber-950/20')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category || '-'}</td>
                    <td className={cn('px-4 py-3 text-right font-bold', isLow ? 'text-amber-600' : 'text-foreground')}>
                      {Number(item.current_stock).toFixed(1)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{Number(item.min_stock).toFixed(1)} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatPrice(item.cost_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setMovementModal({ item, type: 'entry' })} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950" title="Entrada">
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setMovementModal({ item, type: 'exit' })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950" title="Saida">
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/admin/inventory/${item.id}`)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum insumo cadastrado</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Movement Modal */}
      {movementModal && (
        <Modal open onClose={() => setMovementModal(null)} title={`${movementModal.type === 'entry' ? 'Entrada' : movementModal.type === 'exit' ? 'Saida' : 'Ajuste'} — ${movementModal.item.name}`} className="md:max-w-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleMovement(); }} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Quantidade ({movementModal.item.unit})</label>
              <Input type="number" value={movQty} onChange={(e) => setMovQty(e.target.value)} placeholder="0" autoFocus />
              <p className="text-xs text-muted-foreground mt-1">Estoque atual: {Number(movementModal.item.current_stock).toFixed(1)} {movementModal.item.unit}</p>
            </div>
            {movementModal.type === 'entry' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Custo unitario (R$)</label>
                <Input type="number" value={movCost} onChange={(e) => setMovCost(e.target.value)} placeholder={String(movementModal.item.cost_price)} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Motivo</label>
              <Input value={movReason} onChange={(e) => setMovReason(e.target.value)} placeholder="Ex: Compra fornecedor, perda..." />
            </div>
            <Button type="submit" className="w-full" disabled={!movQty}>
              Confirmar {movementModal.type === 'entry' ? 'Entrada' : 'Saida'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Excluir Insumo"
        message="Tem certeza? Todas as movimentacoes e fichas tecnicas vinculadas serao removidas."
        onConfirm={async () => { if (deleteId) await deleteItem(deleteId); setDeleteId(null); }}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
}
