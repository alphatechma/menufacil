import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Shield, Lock, Save, Check, KeyRound } from 'lucide-react';
import { useGetProfileQuery, useUpdateProfileMutation, useChangePasswordMutation } from '@/api/adminApi';
import { profileSchema, type ProfileFormData, passwordChangeSchema, type PasswordChangeFormData } from '@/schemas/admin/profileSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SettingsPageSkeleton } from '@/components/ui/Skeleton';

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Caixa',
  kitchen: 'Cozinha',
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Produtos',
  categories: 'Categorias',
  orders: 'Pedidos',
  customers: 'Clientes',
  delivery: 'Entregas',
  coupons: 'Cupons',
  loyalty: 'Fidelidade',
  kds: 'KDS',
  reports: 'Relatorios',
  delivery_driver: 'Painel Entregador',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  read: 'Visualizar',
  update: 'Editar',
  delete: 'Remover',
  cancel: 'Cancelar',
};

const getRoleLabel = (role: string) => SYSTEM_ROLE_LABELS[role] || role;

export default function Profile() {
  const { data: profile, isLoading } = useGetProfileQuery();
  const [updateProfile, { isLoading: isSavingName, error: nameError }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isSavingPassword, error: passwordError }] = useChangePasswordMutation();

  const isAdmin = ['admin', 'super_admin'].includes(profile?.system_role || profile?.role || '');

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const permissions = profile?.role?.permissions || [];
    if (permissions.length === 0) return {};
    const grouped: Record<string, string[]> = {};
    for (const perm of permissions) {
      const key = perm.key || '';
      const [mod, action] = key.split(':');
      if (!mod) continue;
      if (!grouped[mod]) grouped[mod] = [];
      if (action) grouped[mod].push(action);
    }
    return grouped;
  }, [profile?.role?.permissions]);

  const [nameSuccess, setNameSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '' },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (profile) {
      resetProfile({ name: profile.name ?? '' });
    }
  }, [profile, resetProfile]);

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!profile) return;
    try {
      await updateProfile({ id: profile.id, name: data.name }).unwrap();
      setNameSuccess('Nome atualizado com sucesso!');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch {
      // Error is captured by RTK Query
    }
  };

  const onSubmitPassword = async (data: PasswordChangeFormData) => {
    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      }).unwrap();
      setPasswordSuccess('Senha alterada com sucesso!');
      resetPassword();
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch {
      // Error is captured by RTK Query
    }
  };

  if (isLoading) return <SettingsPageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informacoes pessoais e senha</p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl">
            {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{profile?.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {profile?.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                {getRoleLabel(profile?.system_role || '')}
                {profile?.role?.name && ` - ${profile.role.name}`}
              </span>
            </div>
            {profile?.created_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Name Section */}
      <form onSubmit={handleProfileSubmit(onSubmitProfile)}>
        <FormCard
          footer={
            <Button type="submit" loading={isSavingName}>
              <Save className="w-4 h-4" />
              Salvar Nome
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Informacoes Pessoais</h3>
          </div>

          {nameSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
              {nameSuccess}
            </div>
          )}

          {!!nameError && (
            <ErrorAlert message="Erro ao atualizar nome. Tente novamente." />
          )}

          <div className="max-w-lg space-y-4">
            <FormField control={profileControl} name="name" label="Nome" required>
              {(field) => (
                <Input {...field} placeholder="Seu nome" />
              )}
            </FormField>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">O email nao pode ser alterado.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Funcao</label>
              <Input
                value={getRoleLabel(profile?.system_role || '')}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>
        </FormCard>
      </form>

      {/* Change Password Section */}
      <form onSubmit={handlePasswordSubmit(onSubmitPassword)}>
        <FormCard
          footer={
            <Button type="submit" loading={isSavingPassword}>
              <Lock className="w-4 h-4" />
              Alterar Senha
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Alterar Senha</h3>
          </div>

          {passwordSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
              {passwordSuccess}
            </div>
          )}

          {!!passwordError && (
            <ErrorAlert message="Erro ao alterar senha. Verifique sua senha atual." />
          )}

          <div className="max-w-lg space-y-4">
            <FormField control={passwordControl} name="current_password" label="Senha atual" required>
              {(field) => (
                <PasswordInput
                  {...field}
                  placeholder="Digite sua senha atual"
                />
              )}
            </FormField>

            <FormField control={passwordControl} name="new_password" label="Nova senha" required>
              {(field) => (
                <PasswordInput
                  {...field}
                  placeholder="Digite a nova senha (min. 6 caracteres)"
                />
              )}
            </FormField>

            <FormField control={passwordControl} name="confirm_password" label="Confirmar nova senha" required>
              {(field) => (
                <PasswordInput
                  {...field}
                  placeholder="Confirme a nova senha"
                />
              )}
            </FormField>
          </div>
        </FormCard>
      </form>

      {/* Access Profile & Permissions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-foreground">Perfil de Acesso</h3>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
              {getRoleLabel(profile?.system_role || profile?.role || '')}
            </span>
          </div>
          {profile?.role?.name && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                {profile.role.name}
              </span>
            </div>
          )}
        </div>

        {isAdmin ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-400">Acesso completo</p>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Administradores possuem acesso total a todas as funcionalidades do sistema.
            </p>
          </div>
        ) : Object.keys(permissionsByModule).length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Suas permissoes no sistema:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(permissionsByModule).map(([mod, actions]) => (
                <div key={mod} className="bg-muted rounded-xl p-3 border border-border">
                  <p className="text-sm font-semibold text-foreground mb-1.5">
                    {MODULE_LABELS[mod] || mod}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => (
                      <span
                        key={action}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-border text-xs text-muted-foreground"
                      >
                        <Check className="w-3 h-3 text-green-500" />
                        {ACTION_LABELS[action] || action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma permissao personalizada configurada.</p>
        )}
      </div>
    </div>
  );
}
