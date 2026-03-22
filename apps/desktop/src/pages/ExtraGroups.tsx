import { useState } from 'react';
import { ListPlus, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import {
  useGetExtraGroupsQuery,
  useCreateExtraGroupMutation,
  useUpdateExtraGroupMutation,
  useDeleteExtraGroupMutation,
} from '@/api/api';
import { formatPrice } from '@/utils/formatPrice';

interface ExtraItem {
  name: string;
  price: number;
}

interface ExtraGroupForm {
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  extras: ExtraItem[];
}

const emptyForm: ExtraGroupForm = {
  name: '',
  min_select: 0,
  max_select: 1,
  is_required: false,
  extras: [],
};

export default function ExtraGroups() {
  const { data: groups = [], isLoading } = useGetExtraGroupsQuery();
  const [createGroup, { isLoading: creating }] = useCreateExtraGroupMutation();
  const [updateGroup, { isLoading: updating }] = useUpdateExtraGroupMutation();
  const [deleteGroup] = useDeleteExtraGroupMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExtraGroupForm>(emptyForm);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (g: any) => {
    setEditingId(g.id);
    setForm({
      name: g.name || '',
      min_select: g.min_select || 0,
      max_select: g.max_select || 1,
      is_required: g.is_required || false,
      extras: (g.extras || []).map((e: any) => ({ name: e.name, price: e.price || 0 })),
    });
    setModalOpen(true);
  };

  const addExtra = () => {
    setForm({ ...form, extras: [...form.extras, { name: '', price: 0 }] });
  };

  const removeExtra = (idx: number) => {
    setForm({ ...form, extras: form.extras.filter((_, i) => i !== idx) });
  };

  const updateExtra = (idx: number, field: keyof ExtraItem, value: any) => {
    const updated = [...form.extras];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, extras: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      ...form,
      extras: form.extras.map((ex) => ({
        name: ex.name,
        price: typeof ex.price === 'string' ? parseFloat(String(ex.price).replace(',', '.')) || 0 : ex.price,
      })),
    };
    if (editingId) {
      await updateGroup({ id: editingId, data });
    } else {
      await createGroup(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo de extras?')) return;
    await deleteGroup(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListPlus className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Grupos de Extras</h1>
          <span className="text-sm text-gray-500">{groups.length} grupo(s)</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ListPlus className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum grupo de extras</p>
          </div>
        ) : (
          groups.map((g: any) => {
            const isExpanded = expanded.has(g.id);
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button onClick={() => toggleExpand(g.id)} className="flex items-center gap-3 flex-1">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="text-left">
                      <span className="text-sm font-bold text-gray-900">{g.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        Min: {g.min_select || 0} / Max: {g.max_select || 1}
                        {g.is_required && <span className="ml-1 text-orange-500 font-medium">(Obrigatorio)</span>}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 mr-2">{g.extras?.length || 0} extra(s)</span>
                    <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {isExpanded && g.extras?.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    {g.extras.map((ex: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-gray-700">{ex.name}</span>
                        <span className="font-medium text-gray-900">{formatPrice(ex.price || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Selecao</label>
                  <input
                    type="number"
                    value={form.min_select}
                    onChange={(e) => setForm({ ...form, min_select: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max. Selecao</label>
                  <input
                    type="number"
                    value={form.max_select}
                    onChange={(e) => setForm({ ...form, max_select: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    min={1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label className="text-sm text-gray-700">Obrigatorio</label>
              </div>

              {/* Extras */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Extras</label>
                  <button type="button" onClick={addExtra} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                    + Adicionar Extra
                  </button>
                </div>
                <div className="space-y-2">
                  {form.extras.map((ex, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => updateExtra(idx, 'name', e.target.value)}
                        placeholder="Nome do extra"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={ex.price}
                        onChange={(e) => updateExtra(idx, 'price', Number(e.target.value))}
                        placeholder="Preço"
                        step="0.01"
                        className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button type="button" onClick={() => removeExtra(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {creating || updating ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
