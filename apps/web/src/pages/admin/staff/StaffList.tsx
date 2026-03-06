import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Shield, Monitor, ShoppingCart, ChefHat, UserCog, KeyRound } from 'lucide-react';
import { useGetStaffQuery, useDeleteStaffMutation } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700', icon: <Shield className="w-3.5 h-3.5" /> },
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: <Shield className="w-3.5 h-3.5" /> },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-700', icon: <UserCog className="w-3.5 h-3.5" /> },
  cashier: { label: 'Membro', color: 'bg-green-100 text-green-700', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  kitchen: { label: 'Membro', color: 'bg-orange-100 text-orange-700', icon: <ChefHat className="w-3.5 h-3.5" /> },
};

export default function StaffList() {
  const navigate = useNavigate();
  const { data: staff = [], isLoading } = useGetStaffQuery();
  const [deleteStaff] = useDeleteStaffMutation();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = staff.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStaff(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Equipe"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/staff/roles')}>
              <KeyRound className="w-4 h-4" />
              Perfis de Acesso
            </Button>
            <Button onClick={() => navigate('/admin/staff/new')}>
              <Plus className="w-4 h-4" />
              Novo Membro
            </Button>
          </div>
        }
      />

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum membro encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Adicione membros da equipe para gerenciar o acesso ao sistema.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((member: any) => {
            const role = ROLE_CONFIG[member.system_role || member.role] || ROLE_CONFIG.cashier;
            return (
              <Card
                key={member.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/staff/${member.id}/edit`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        {!member.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                      {role.icon}
                      {role.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: member.id, name: member.name });
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Desativar membro"
        message={`Tem certeza que deseja desativar "${deleteTarget?.name}"? Ele perdera acesso ao sistema.`}
        confirmLabel="Desativar"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
