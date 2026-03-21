import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useGetDeliveryZonesQuery,
  useCreateDeliveryZoneMutation,
  useUpdateDeliveryZoneMutation,
  useDeleteDeliveryZoneMutation,
} from '@/api/api';
import { formatPrice } from '@/utils/formatPrice';

interface ZoneForm {
  name: string;
  fee: string;
  neighborhoods: string;
  estimated_time: string;
  is_active: boolean;
}

const emptyForm: ZoneForm = { name: '', fee: '', neighborhoods: '', estimated_time: '', is_active: true };

export default function DeliveryZones() {
  const { data: zones = [], isLoading } = useGetDeliveryZonesQuery();
  const [createZone, { isLoading: creating }] = useCreateDeliveryZoneMutation();
  const [updateZone, { isLoading: updating }] = useUpdateDeliveryZoneMutation();
  const [deleteZone] = useDeleteDeliveryZoneMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (z: any) => {
    setEditingId(z.id);
    setForm({
      name: z.name || '',
      fee: String(z.fee || z.delivery_fee || ''),
      neighborhoods: Array.isArray(z.neighborhoods) ? z.neighborhoods.join(', ') : (z.neighborhoods || ''),
      estimated_time: String(z.estimated_time || z.delivery_time || ''),
      is_active: z.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      fee: parseFloat(form.fee) || 0,
      delivery_fee: parseFloat(form.fee) || 0,
      neighborhoods: form.neighborhoods.split(',').map((n) => n.trim()).filter(Boolean),
      estimated_time: parseInt(form.estimated_time) || 0,
      delivery_time: parseInt(form.estimated_time) || 0,
      is_active: form.is_active,
    };
    if (editingId) {
      await updateZone({ id: editingId, data });
    } else {
      await createZone(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta zona?')) return;
    await deleteZone(id);
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
          <MapPin className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Zonas de Entrega</h1>
          <span className="text-sm text-gray-500">{zones.length} zona(s)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Nova Zona
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MapPin className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhuma zona de entrega</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map((z: any) => (
              <div key={z.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900">{z.name}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(z)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(z.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Taxa</span>
                    <span className="font-medium text-gray-900">{formatPrice(z.fee || z.delivery_fee || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tempo estimado</span>
                    <span className="text-gray-700">{z.estimated_time || z.delivery_time || 0} min</span>
                  </div>
                  {(z.neighborhoods?.length > 0) && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(z.neighborhoods) ? z.neighborhoods : []).map((n: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Zona' : 'Nova Zona'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa (R$)</label>
                  <input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (min)</label>
                  <input type="number" value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairros (separados por virgula)</label>
                <textarea value={form.neighborhoods} onChange={(e) => setForm({ ...form, neighborhoods: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <label className="text-sm text-gray-700">Zona ativa</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating || updating} className="px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50">
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
