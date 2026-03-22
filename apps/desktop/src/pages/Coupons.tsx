import { useState } from 'react';
import { Ticket, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} from '@/api/api';
import { formatPrice } from '@/utils/formatPrice';

interface CouponForm {
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
}

const emptyForm: CouponForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
};

export default function Coupons() {
  const { data: coupons = [], isLoading } = useGetCouponsQuery();
  const [createCoupon, { isLoading: creating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: updating }] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      code: c.code || '',
      discount_type: c.discount_type || 'percentage',
      discount_value: String(c.discount_value || ''),
      min_order_value: String(c.min_order_value || ''),
      max_uses: String(c.max_uses || ''),
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
      is_active: c.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order_value: parseFloat(form.min_order_value) || 0,
      max_uses: parseInt(form.max_uses) || null,
      expires_at: form.expires_at || null,
    };
    if (editingId) {
      await updateCoupon({ id: editingId, data });
    } else {
      await createCoupon(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return;
    await deleteCoupon(id);
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
          <Ticket className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Cupons</h1>
          <span className="text-sm text-gray-500">{coupons.length} cupom(ns)</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Ticket className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum cupom cadastrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Desconto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pedido Min.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Validade</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.discount_type === 'percentage' ? 'Percentual' : 'Valor Fixo'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatPrice(c.discount_value || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {c.min_order_value ? formatPrice(c.min_order_value) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">
                    {c.uses_count || 0}/{c.max_uses || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : 'Sem validade'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${c.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Editar Cupom' : 'Novo Cupom'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Desconto</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    value={form.min_order_value}
                    onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max. Usos</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label className="text-sm text-gray-700">Cupom ativo</label>
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
