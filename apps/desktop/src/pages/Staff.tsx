import { useState } from 'react';
import { UsersRound, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetRolesQuery,
} from '@/api/api';
import { cn } from '@/utils/cn';

interface StaffForm {
  name: string;
  email: string;
  password: string;
  system_role: string;
  role_id: string;
}

const emptyForm: StaffForm = { name: '', email: '', password: '', system_role: 'cashier', role_id: '' };

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Caixa',
  kitchen: 'Cozinha',
};

export default function Staff() {
  const { data: staff = [], isLoading } = useGetStaffQuery();
  const { data: roles = [] } = useGetRolesQuery();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      email: s.email || '',
      password: '',
      system_role: s.system_role || 'cashier',
      role_id: s.role_id || s.role?.id || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: form.name,
      email: form.email,
      system_role: form.system_role,
      role_id: form.role_id || undefined,
    };
    if (form.password) data.password = form.password;
    if (editingId) {
      await updateStaff({ id: editingId, data });
    } else {
      data.password = form.password;
      await createStaff(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuario?')) return;
    await deleteStaff(id);
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
          <UsersRound className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Equipe</h1>
          <span className="text-sm text-gray-500">{staff.length} usuario(s)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Novo Usuario
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UsersRound className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum usuario cadastrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Função</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                        {s.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                      s.system_role === 'admin' ? 'bg-purple-50 text-purple-700' :
                      s.system_role === 'manager' ? 'bg-blue-50 text-blue-700' :
                      s.system_role === 'kitchen' ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {roleLabels[s.system_role] || s.system_role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.role?.name || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Usuario' : 'Novo Usuario'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editingId && <span className="text-xs text-gray-400">(deixe vazio para manter)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" {...(!editingId ? { required: true } : {})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                  <select value={form.system_role} onChange={(e) => setForm({ ...form, system_role: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="cashier">Caixa</option>
                    <option value="kitchen">Cozinha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo (Role)</label>
                  <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="">Nenhum</option>
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
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
