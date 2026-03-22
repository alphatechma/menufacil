import { useState } from 'react';
import { Bike, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useGetDeliveryPersonsQuery,
  useCreateDeliveryPersonMutation,
  useUpdateDeliveryPersonMutation,
  useDeleteDeliveryPersonMutation,
} from '@/api/api';

interface PersonForm {
  name: string;
  phone: string;
  vehicle: string;
  commission_rate: string;
  is_active: boolean;
}

const emptyForm: PersonForm = { name: '', phone: '', vehicle: 'motorcycle', commission_rate: '', is_active: true };

export default function DeliveryPersons() {
  const { data: persons = [], isLoading } = useGetDeliveryPersonsQuery();
  const [createPerson, { isLoading: creating }] = useCreateDeliveryPersonMutation();
  const [updatePerson, { isLoading: updating }] = useUpdateDeliveryPersonMutation();
  const [deletePerson] = useDeleteDeliveryPersonMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonForm>(emptyForm);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      phone: p.phone || '',
      vehicle: p.vehicle || 'motorcycle',
      commission_rate: String(p.commission_rate || ''),
      is_active: p.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, commission_rate: parseFloat(form.commission_rate) || 0 };
    if (editingId) {
      await updatePerson({ id: editingId, data });
    } else {
      await createPerson(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este entregador?')) return;
    await deletePerson(id);
  };

  const vehicleLabel: Record<string, string> = {
    motorcycle: 'Moto',
    bicycle: 'Bicicleta',
    car: 'Carro',
    walking: 'A pe',
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
          <Bike className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Entregadores</h1>
          <span className="text-sm text-gray-500">{persons.length} entregador(es)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Novo Entregador
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bike className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum entregador cadastrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Veiculo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comissão</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {persons.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{vehicleLabel[p.vehicle] || p.vehicle || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{p.commission_rate || 0}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${p.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Entregador' : 'Novo Entregador'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veiculo</label>
                  <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="motorcycle">Moto</option>
                    <option value="bicycle">Bicicleta</option>
                    <option value="car">Carro</option>
                    <option value="walking">A pe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
                  <input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" step="0.1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <label className="text-sm text-gray-700">Ativo</label>
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
