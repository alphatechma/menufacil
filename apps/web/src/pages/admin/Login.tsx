import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, UtensilsCrossed, ChefHat, ShieldCheck, BarChart3 } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
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
  const notify = useNotify();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setFieldErrors({});

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

      notify.success('Login realizado com sucesso!');
      navigate('/admin');
    } catch (err: any) {
      const message =
        err?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(message);
      notify.error(message);

      // Parse field-level errors from API response
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        const errors: Record<string, string> = {};
        for (const e of err.data.errors) {
          if (e.field && e.message) {
            errors[e.field] = e.message;
          }
        }
        setFieldErrors(errors);
      } else if (err?.data?.message && Array.isArray(err.data.message)) {
        // class-validator returns array of messages
        const errors: Record<string, string> = {};
        for (const msg of err.data.message) {
          if (typeof msg === 'string') {
            if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('e-mail')) {
              errors.email = msg;
            } else if (msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('password')) {
              errors.password = msg;
            }
          }
        }
        setFieldErrors(errors);
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Branding Panel - visible on desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative flex-col justify-between p-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 rounded-full bg-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo-icon.png" alt="MenuFácil" className="w-12 h-12 rounded-xl" />
            <span className="text-2xl font-bold text-primary-foreground">MenuFácil</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
            Gerencie seu restaurante com facilidade
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Pedidos, cardápio, entregas e muito mais em uma única plataforma.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                <ChefHat className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-primary-foreground/90 text-sm font-medium">
                Cardapio digital completo
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-primary-foreground/90 text-sm font-medium">
                Controle de equipe e permissões
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-primary-foreground/90 text-sm font-medium">
                Relatórios e insights em tempo real
              </span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-primary-foreground/60 text-sm">
          MenuFácil &copy; {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <img src="/logo-icon.png" alt="MenuFácil" className="w-16 h-16 rounded-2xl mb-4 mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">MenuFácil</h1>
              <p className="text-muted-foreground mt-1">Painel Administrativo</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <FormField control={control} name="email" label="E-mail" required>
                {(field) => (
                  <>
                    <Input
                      {...field}
                      type="email"
                      placeholder="admin@exemplo.com"
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
                    )}
                  </>
                )}
              </FormField>

              {/* Password */}
              <FormField control={control} name="password" label="Senha" required>
                {(field) => (
                  <>
                    <PasswordInput
                      {...field}
                      placeholder="Sua senha"
                    />
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
                    )}
                  </>
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

          {/* Footer - visible only on mobile */}
          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            MenuFácil &copy; {new Date().getFullYear()}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
