import { useState, type FormEvent } from 'react';
import { UtensilsCrossed, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAdminLoginMutation } from '@/api/api';
import { loginSuccess } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { cn } from '@/utils/cn';

const SLUG_STORAGE_KEY = 'menufacil-desktop-slug';

export default function Login() {
  const dispatch = useAppDispatch();
  const [adminLogin, { isLoading }] = useAdminLoginMutation();

  const savedSlug = localStorage.getItem(SLUG_STORAGE_KEY) ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(savedSlug);
  const [rememberSlug, setRememberSlug] = useState(!!savedSlug);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !tenantSlug) {
      setError('Preencha todos os campos.');
      return;
    }

    try {
      if (rememberSlug) {
        localStorage.setItem(SLUG_STORAGE_KEY, tenantSlug);
      } else {
        localStorage.removeItem(SLUG_STORAGE_KEY);
      }

      const result = await adminLogin({ email, password }).unwrap();

      dispatch(
        loginSuccess({
          user: result.user,
          token: result.access_token,
          tenantSlug,
        }),
      );
    } catch (err: any) {
      const message =
        err?.data?.message ?? err?.message ?? 'Erro ao fazer login. Tente novamente.';
      setError(typeof message === 'string' ? message : 'Erro ao fazer login.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">MenuFacil</h1>
            <p className="mt-1 text-sm text-gray-400">Sistema PDV Desktop</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-800 bg-gray-800/60 p-8 shadow-xl backdrop-blur-sm"
        >
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-danger/10 p-4 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant Slug */}
          <div className="mb-5">
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-gray-300">
              Identificador do restaurante
            </label>
            <input
              id="slug"
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="meu-restaurante"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>

          {/* Email */}
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restaurante.com"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember */}
          <label className="mb-6 flex items-center gap-2 text-sm text-gray-400 select-none">
            <input
              type="checkbox"
              checked={rememberSlug}
              onChange={(e) => setRememberSlug(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary accent-primary"
            />
            Lembrar identificador
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all',
              'hover:bg-primary-dark active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          MenuFacil Desktop v0.1.0
        </p>
      </div>
    </div>
  );
}
