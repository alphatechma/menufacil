import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useLoginMutation } from '@/api/superAdminApi';
import { login } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui/button';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loginMutation, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { user, access_token, refresh_token } = await loginMutation({
        email,
        password,
      }).unwrap();

      dispatch(
        login({
          user,
          accessToken: access_token,
          refreshToken: refresh_token,
        }),
      );

      navigate('/');
    } catch (err: any) {
      const message =
        err?.data?.message ||
        'Credenciais invalidas. Verifique e tente novamente.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] gradient-mesh grid-bg relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center mb-4">
            <span className="text-xl font-extrabold text-indigo-400">MF</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">MenuFacil</h1>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              Manager
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-2">Acesso ao painel de gerenciamento</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-zinc-100">Bem-vindo de volta</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Entre com suas credenciais para continuar.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-3.5 bg-red-500/[0.06] border border-red-500/20 rounded-xl text-sm animate-scale-in glow-red">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-[13px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@menufacil.com"
                className="w-full h-11 px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-12 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:glow-indigo active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="ml-2">Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span className="ml-2">Entrar</span>
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-8">
          MenuFacil &copy; {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
