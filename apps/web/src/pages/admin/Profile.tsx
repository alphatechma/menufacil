import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Shield, Lock, Save } from 'lucide-react';
import { useGetProfileQuery, useUpdateProfileMutation, useChangePasswordMutation } from '@/api/adminApi';
import { profileSchema, type ProfileFormData, passwordChangeSchema, type PasswordChangeFormData } from '@/schemas/admin/profileSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageSpinner } from '@/components/ui/Spinner';

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'manager':
      return 'Gerente';
    case 'cashier':
      return 'Caixa';
    case 'kitchen':
      return 'Cozinha';
    default:
      return role;
  }
};

export default function Profile() {
  const { data: profile, isLoading } = useGetProfileQuery();
  const [updateProfile, { isLoading: isSavingName, error: nameError }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isSavingPassword, error: passwordError }] = useChangePasswordMutation();

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

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 mt-1">Gerencie suas informacoes pessoais e senha</p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl">
            {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{profile?.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mail className="w-4 h-4" />
                {profile?.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                {getRoleLabel(profile?.role || '')}
              </span>
            </div>
            {profile?.created_at && (
              <p className="text-xs text-gray-400 mt-1">
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
            <User className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Informacoes Pessoais</h3>
          </div>

          {nameSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">O email nao pode ser alterado.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Funcao</label>
              <Input
                value={getRoleLabel(profile?.role || '')}
                disabled
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
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
            <Lock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Alterar Senha</h3>
          </div>

          {passwordSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
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
    </div>
  );
}
