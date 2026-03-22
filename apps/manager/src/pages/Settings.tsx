import { useState, type FormEvent } from 'react';
import { Save, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';
import { useUpdateProfileMutation, useChangePasswordMutation } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const notify = useNotify();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const auth = useAppSelector((state) => state.auth);

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!profileForm.name.trim()) {
      notify.error('O nome e obrigatorio.');
      return;
    }

    try {
      await updateProfile({ name: profileForm.name.trim() }).unwrap();

      // Update user in Redux state
      if (user) {
        dispatch(
          login({
            user: { ...user, name: profileForm.name.trim() },
            accessToken: auth.accessToken!,
            refreshToken: auth.refreshToken!,
          }),
        );
      }

      notify.success('Perfil atualizado com sucesso.');
    } catch (err: any) {
      const message = err?.data?.message || 'Erro ao atualizar perfil.';
      notify.error(message);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!passwordForm.current_password) {
      notify.error('A senha atual e obrigatoria.');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      notify.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notify.error('As senhas nao coincidem.');
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.current_password,
        newPassword: passwordForm.new_password,
      }).unwrap();

      notify.success('Senha alterada com sucesso.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowCurrentPw(false);
      setShowNewPw(false);
    } catch (err: any) {
      const message = err?.data?.message || 'Erro ao alterar senha.';
      notify.error(message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Configuracoes</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Gerencie seu perfil e preferencias.
        </p>
      </div>

      {/* Profile */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white">
              <span className="text-xl font-bold">{user?.name?.charAt(0).toUpperCase() || 'S'}</span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              <Badge
                variant="secondary"
                className="mt-1.5 bg-primary/10 text-primary hover:bg-primary/10"
              >
                Super Admin
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-[hsl(var(--muted))]"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  O e-mail nao pode ser alterado.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--muted))]">
              <Lock className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Atualize sua senha de acesso.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current_password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {savingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
