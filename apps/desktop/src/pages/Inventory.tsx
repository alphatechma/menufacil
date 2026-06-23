import { useState } from 'react';
import {
  Warehouse,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
} from 'lucide-react';
import {
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetStockMovementsQuery,
  useCreateStockMovementMutation,
} from '@/api/api';
import { useNotify } from '@/hooks/useNotify';

interface ItemForm {
  name: string;
  unit: string;
  current_stock: string;
  min_stock: string;
  cost_price: string;
}

const emptyForm: ItemForm = { name: '', unit: 'un', current_stock: '0', min_stock: '0', cost_price: '0' };

const UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'mL', label: 'Mililitro (mL)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
];

export default function Inventory() {
  const { data: items = [], isLoading } = useGetInventoryItemsQuery();
  const { data: movements = [] } = useGetStockMovementsQuery();
  const [createItem, { isLoading: creating }] = useCreateInventoryItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateInventoryItemMutation();
  const [deleteItem] = useDeleteInventoryItemMutation();
  const [createMovement, { isLoading: movementCreating }] = useCreateStockMovementMutation();
  const notify = useNotify();

  const [modalOpen, setModalOpen] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [movementForm, setMovementForm] = useState({ item_id: '', type: 'entry', quantity: '', reason: '' });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      unit: item.unit || 'un',
      current_stock: String(item.current_stock || 0),
      min_stock: String(item.min_stock || 0),
      cost_price: String(item.cost_price ?? 0),
    });
    setModalOpen(true);
  };

  const openMovement = (itemId?: string) => {
    setMovementForm({ item_id: itemId || '', type: 'entry', quantity: '', reason: '' });
    setMovementModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      name: form.name,
      unit: form.unit,
      min_stock: parseFloat(form.min_stock) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
    };
    try {
      if (editingId) {
        // current_stock não faz parte do update (estoque muda via movimentação)
        await updateItem({ id: editingId, data: base }).unwrap();
      } else {
        await createItem({ ...base, current_stock: parseFloat(form.current_stock) || 0 }).unwrap();
      }
      notify.success('Item salvo com sucesso!');
      setModalOpen(false);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao salvar item.');
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMovement({
        ...movementForm,
        quantity: parseFloat(movementForm.quantity) || 0,
      }).unwrap();
      notify.success('Movimentação registrada!');
      setMovementModal(false);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao registrar movimentação.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await deleteItem(id).unwrap();
      notify.success('Item excluído.');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao excluir item.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Warehouse className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Estoque</h1>
          <span className="text-sm text-gray-500">{items.length} item(ns)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMovements(!showMovements)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <History className="w-4 h-4" />
            Movimentacoes
          </button>
          <button
            onClick={() => openMovement()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors active:scale-95"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Entrada/Saida
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors active:scale-95">
            <Plus className="w-4 h-4" /> Novo Item
          </button>
        </div>
      </div>

      {!showMovements ? (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Warehouse className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Nenhum item no estoque</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">Adicione itens para controlar o estoque</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unidade</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque Atual</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque Min.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Custo/Un.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: any) => {
                  const isLow = (item.current_stock || 0) <= (item.min_stock || 0);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.current_stock || 0}
                        </span>
                        {isLow && <span className="ml-1 text-[10px] text-red-500 font-medium">BAIXO</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.min_stock || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">R$ {Number(item.cost_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openMovement(item.id)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Movimentar">
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(movements || []).map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.item?.name || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {m.type === 'entry' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><ArrowDownCircle className="w-3 h-3" /> Entrada</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><ArrowUpCircle className="w-3 h-3" /> Saida</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{m.quantity || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{m.reason || '-'}</td>
                </tr>
              ))}
              {(!movements || movements.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">Nenhuma movimentacao registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Item modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
                  <input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} disabled={!!editingId} title={editingId ? 'Ajustado via movimentação de estoque' : undefined} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo</label>
                  <input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custo/Un.</label>
                  <input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" step="0.01" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating || updating} className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {creating || updating ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Nova Movimentacao</h2>
              <button onClick={() => setMovementModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                <select value={movementForm.item_id} onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" required>
                  <option value="">Selecione...</option>
                  {items.map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="entry">Entrada</option>
                    <option value="exit">Saida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input type="number" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" step="0.01" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input type="text" value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMovementModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={movementCreating} className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {movementCreating ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
