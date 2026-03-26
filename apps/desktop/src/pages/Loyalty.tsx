import { useState } from 'react';
import { Heart, Plus, Pencil, Trash2, X, Gift } from 'lucide-react';
import {
  useGetLoyaltyRewardsQuery,
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
} from '@/api/api';

interface RewardForm {
  name: string;
  description: string;
  points_required: string;
  reward_type: string;
  reward_value: string;
  is_active: boolean;
}

const emptyForm: RewardForm = {
  name: '',
  description: '',
  points_required: '',
  reward_type: 'discount_percentage',
  reward_value: '',
  is_active: true,
};

export default function Loyalty() {
  const { data: rewards = [], isLoading } = useGetLoyaltyRewardsQuery();
  const [createReward, { isLoading: creating }] = useCreateLoyaltyRewardMutation();
  const [updateReward, { isLoading: updating }] = useUpdateLoyaltyRewardMutation();
  const [deleteReward] = useDeleteLoyaltyRewardMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      name: r.name || '',
      description: r.description || '',
      points_required: String(r.points_required || ''),
      reward_type: r.reward_type || 'discount_percentage',
      reward_value: String(r.reward_value || ''),
      is_active: r.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      points_required: parseInt(form.points_required) || 0,
      reward_value: parseFloat(form.reward_value) || 0,
    };
    if (editingId) {
      await updateReward({ id: editingId, data });
    } else {
      await createReward(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta recompensa?')) return;
    await deleteReward(id);
  };

  const rewardTypeLabel: Record<string, string> = {
    discount_percentage: 'Desconto %',
    discount_fixed: 'Desconto Fixo',
    free_item: 'Item Gratis',
    free_delivery: 'Frete Gratis',
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
          <Heart className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Fidelidade</h1>
          <span className="text-sm text-gray-500">{rewards.length} recompensa(s)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Nova Recompensa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma recompensa cadastrada</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">Crie recompensas para seu programa de fidelidade</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewards.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{r.name}</h3>
                      {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{r.points_required || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Pontos</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {rewardTypeLabel[r.reward_type] || r.reward_type}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${r.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {r.is_active !== false ? 'Ativo' : 'Inativo'}
                  </span>
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Recompensa' : 'Nova Recompensa'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos Necessarios</label>
                <input type="number" value={form.points_required} onChange={(e) => setForm({ ...form, points_required: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.reward_type} onChange={(e) => setForm({ ...form, reward_type: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="discount_percentage">Desconto %</option>
                    <option value="discount_fixed">Desconto Fixo</option>
                    <option value="free_item">Item Gratis</option>
                    <option value="free_delivery">Frete Gratis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input type="number" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" step="0.01" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <label className="text-sm text-gray-700">Ativa</label>
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
