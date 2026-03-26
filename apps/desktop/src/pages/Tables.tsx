import { useState } from 'react';
import { LayoutGrid, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from '@/api/api';
import { cn } from '@/utils/cn';

interface TableForm {
  number: string;
  seats: string;
  status: string;
}

const emptyForm: TableForm = { number: '', seats: '4', status: 'available' };

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  available: { label: 'Disponivel', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  occupied: { label: 'Ocupada', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  reserved: { label: 'Reservada', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  inactive: { label: 'Inativa', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
};

export default function Tables() {
  const { data: tables = [], isLoading } = useGetTablesQuery();
  const [createTable, { isLoading: creating }] = useCreateTableMutation();
  const [updateTable, { isLoading: updating }] = useUpdateTableMutation();
  const [deleteTable] = useDeleteTableMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TableForm>(emptyForm);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      number: String(t.number || ''),
      seats: String(t.seats || t.capacity || '4'),
      status: t.status || 'available',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      number: parseInt(form.number) || 0,
      seats: parseInt(form.seats) || 4,
      capacity: parseInt(form.seats) || 4,
      status: form.status,
    };
    if (editingId) {
      await updateTable({ id: editingId, data });
    } else {
      await createTable(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta mesa?')) return;
    await deleteTable(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const sorted = [...tables].sort((a: any, b: any) => (a.number || 0) - (b.number || 0));

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Mesas</h1>
          <span className="text-sm text-gray-500">{tables.length} mesa(s)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Nova Mesa
        </button>
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-3 mb-4">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = tables.filter((t: any) => (t.status || 'available') === key).length;
          if (count === 0) return null;
          return (
            <span key={key} className={cn('inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full', cfg.bg, cfg.text)}>
              <span className={cn('w-2 h-2 rounded-full', key === 'available' ? 'bg-green-500' : key === 'occupied' ? 'bg-red-500' : key === 'reserved' ? 'bg-yellow-500' : 'bg-gray-400')} />
              {count} {cfg.label}
            </span>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma mesa cadastrada</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">Adicione mesas para gerenciar o salao</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sorted.map((t: any) => {
              const status = t.status || 'available';
              const cfg = statusConfig[status] || statusConfig.available;
              return (
                <div
                  key={t.id}
                  className={cn(
                    'relative rounded-2xl border-2 p-4 flex flex-col items-center justify-center min-h-[120px] transition-shadow hover:shadow-md',
                    cfg.bg,
                    cfg.border,
                  )}
                >
                  <span className={cn('text-2xl font-bold', cfg.text)}>
                    {t.number || '?'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">{t.seats || t.capacity || 4} lugares</span>
                  <span className={cn('mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full', cfg.bg, cfg.text, 'border', cfg.border)}>
                    {cfg.label}
                  </span>
                  <div className="absolute top-2 right-2 flex gap-0.5">
                    <button onClick={() => openEdit(t)} className="p-1 text-gray-400 hover:text-primary rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Mesa' : 'Nova Mesa'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugares</label>
                <input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="available">Disponivel</option>
                  <option value="occupied">Ocupada</option>
                  <option value="reserved">Reservada</option>
                  <option value="inactive">Inativa</option>
                </select>
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
    </div>
  );
}
