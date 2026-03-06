import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, UtensilsCrossed } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/schemas/admin/loginSchema';
import { useAdminLoginMutation } from '@/api/adminApi';
import { adminLogin } from '@/store/slices/adminAuthSlice';
import { useAppDispatch } from '@/store/hooks';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useAdminLoginMutation();
  const [error, setError] = useState('');

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');

    try {
      const result = await login(data).unwrap();

      const { user, tenant_slug, modules, plan, permissions } = result;

      dispatch(
        adminLogin({
          user,
          tenantSlug: tenant_slug,
          modules: modules || [],
          permissions: permissions || [],
          plan: plan || null,
        }),
      );

      navigate('/admin');
    } catch (err: any) {
      const message =
        err?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 dark:bg-primary/10 rounded-2xl mb-4">
              <UtensilsCrossed className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">MenuFacil</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Painel Administrativo</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <FormField control={control} name="email" label="E-mail" required>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="admin@exemplo.com"
                />
              )}
            </FormField>

            {/* Password */}
            <FormField control={control} name="password" label="Senha" required>
              {(field) => (
                <PasswordInput
                  {...field}
                  placeholder="Sua senha"
                />
              )}
            </FormField>

            {/* Submit */}
            <Button
              type="submit"
              loading={isLoading}
              className="w-full py-3"
              size="lg"
            >
              <LogIn className="w-5 h-5" />
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          MenuFacil &copy; {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
