import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Check } from 'lucide-react';
import {
  useGetRoleQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
} from '@/api/adminApi';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { useNotify } from '@/hooks/useNotify';

const MODULE_LABELS: Record<string, { name: string; color: string }> = {
  dashboard: { name: 'Dashboard', color: 'bg-slate-500' },
  products: { name: 'Produtos', color: 'bg-blue-500' },
  categories: { name: 'Categorias', color: 'bg-teal-500' },
  orders: { name: 'Pedidos', color: 'bg-orange-500' },
  customers: { name: 'Clientes', color: 'bg-purple-500' },
  delivery: { name: 'Entregas', color: 'bg-green-500' },
  coupons: { name: 'Cupons', color: 'bg-pink-500' },
  loyalty: { name: 'Fidelidade', color: 'bg-amber-500' },
  kds: { name: 'KDS', color: 'bg-indigo-500' },
  reports: { name: 'Relatorios', color: 'bg-gray-500' },
  delivery_driver: { name: 'Painel Entregador', color: 'bg-cyan-500' },
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  read: 'Visualizar',
  update: 'Editar',
  delete: 'Remover',
  cancel: 'Cancelar',
};

export default function RoleForm() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!roleId;

  const { data: role, isLoading: isLoadingRole } = useGetRoleQuery(roleId!, { skip: !isEditing });
  const { data: permissions = [], isLoading: isLoadingPermissions } = useGetPermissionsQuery();
  const [createRole, { isLoading: isCreating, error: createError }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating, error: updateError }] = useUpdateRoleMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, { moduleKey: string; moduleName: string; permissions: any[] }> = {};
    for (const perm of permissions) {
      const moduleKey = perm.module?.key || 'other';
      if (!groups[moduleKey]) {
        groups[moduleKey] = {
          moduleKey,
          moduleName: perm.module?.name || MODULE_LABELS[moduleKey]?.name || moduleKey,
          permissions: [],
        };
      }
      groups[moduleKey].permissions.push(perm);
    }
    return Object.values(groups).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }, [permissions]);

  useEffect(() => {
    if (role) {
      setName(role.name || '');
      setDescription(role.description || '');
      setSelectedPermissions(new Set(role.permissions?.map((p: any) => p.id) || []));
    }
  }, [role]);

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const toggleModule = (modulePerms: any[]) => {
    const allSelected = modulePerms.every((p) => selectedPermissions.has(p.id));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        permission_ids: Array.from(selectedPermissions),
      };

      if (isEditing) {
        await updateRole({ id: roleId!, data: payload }).unwrap();
        notify.success('Perfil atualizado com sucesso');
      } else {
        await createRole(payload).unwrap();
        notify.success('Perfil criado com sucesso');
      }
      navigate('/admin/staff/roles');
    } catch {
      notify.error('Erro ao salvar o perfil');
    }
  };

  if ((isEditing && isLoadingRole) || isLoadingPermissions) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Perfil' : 'Novo Perfil'}
        backTo="/admin/staff/roles"
      />

      {!!error && (
        <ErrorAlert
          message="Erro ao salvar o perfil. Tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormCard>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Informacoes do Perfil
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Nome do perfil <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atendente, Supervisor..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Descricao
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descricao das responsabilidades"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </FormCard>

        <FormCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Permissoes</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Selecione as permissoes que este perfil tera acesso.
                <span className="ml-2 font-medium text-primary">
                  {selectedPermissions.size}/{permissions.length} selecionada(s)
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedPermissions.size === permissions.length) {
                  setSelectedPermissions(new Set());
                } else {
                  setSelectedPermissions(new Set(permissions.map((p: any) => p.id)));
                }
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              {selectedPermissions.size === permissions.length
                ? 'Desmarcar tudo'
                : 'Selecionar tudo'}
            </button>
          </div>

          <div className="space-y-4 mt-2">
            {groupedPermissions.map((group) => {
              const allSelected = group.permissions.every((p) =>
                selectedPermissions.has(p.id),
              );
              const someSelected = group.permissions.some((p) =>
                selectedPermissions.has(p.id),
              );
              const moduleColor =
                MODULE_LABELS[group.moduleKey]?.color || 'bg-gray-500';

              return (
                <div
                  key={group.moduleKey}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  {/* Module header */}
                  <button
                    type="button"
                    onClick={() => toggleModule(group.permissions)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      allSelected
                        ? 'bg-primary/5'
                        : 'bg-muted/50 hover:bg-accent'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${moduleColor} flex items-center justify-center`}
                    >
                      <span className="text-white text-xs font-bold">
                        {group.moduleName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground text-sm">
                        {group.moduleName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {
                          group.permissions.filter((p) =>
                            selectedPermissions.has(p.id),
                          ).length
                        }
                        /{group.permissions.length}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        allSelected
                          ? 'bg-primary border-primary'
                          : someSelected
                            ? 'border-primary bg-primary/30'
                            : 'border-border'
                      }`}
                    >
                      {(allSelected || someSelected) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>

                  {/* Permission checkboxes */}
                  <div className="px-4 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.permissions.map((perm: any) => {
                      const isSelected = selectedPermissions.has(perm.id);
                      const action = perm.key.split(':')[1];
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/5 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePermission(perm.id)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-border'
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          {ACTION_LABELS[action] || perm.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </FormCard>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/staff/roles')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={isSaving} disabled={!name.trim()}>
            {isEditing ? 'Salvar Alteracoes' : 'Criar Perfil'}
          </Button>
        </div>
      </form>
    </div>
  );
}
