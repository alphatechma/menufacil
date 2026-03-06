import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, Lock, ChevronRight } from 'lucide-react';
import { useGetRolesQuery, useDeleteRoleMutation } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function RoleList() {
  const navigate = useNavigate();
  const { data: roles = [], isLoading } = useGetRolesQuery();
  const [deleteRole] = useDeleteRoleMutation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRole(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Perfis de Acesso"
        backTo="/admin/staff"
        actions={
          <Button onClick={() => navigate('/admin/staff/roles/new')}>
            <Plus className="w-4 h-4" />
            Novo Perfil
          </Button>
        }
      />

      <p className="text-sm text-gray-500 mb-6">
        Crie perfis personalizados com permissoes especificas para cada funcao do seu restaurante.
      </p>

      {roles.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum perfil personalizado</p>
          <p className="text-sm text-gray-400 mt-1">
            Crie perfis para definir permissoes especificas alem dos niveis predefinidos.
          </p>
          <Button className="mt-4" onClick={() => navigate('/admin/staff/roles/new')}>
            <Plus className="w-4 h-4" />
            Criar Primeiro Perfil
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {roles.map((role: any) => (
            <Card
              key={role.id}
              className="p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/staff/roles/${role.id}/edit`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      {role.is_system_default && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                          <Lock className="w-3 h-3" />
                          Padrao
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {role.permissions?.length || 0} permissao(es)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!role.is_system_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: role.id, name: role.name });
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir perfil"
        message={`Tem certeza que deseja excluir o perfil "${deleteTarget?.name}"? Membros com esse perfil perderao as permissoes associadas.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
