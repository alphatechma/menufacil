import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Lock,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, login, accessToken, refreshToken, tenantSlug } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Edit name form
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get<UserProfile>('/users/me');
      setProfile(response.data);
      setName(response.data.name);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao carregar perfil.';
      setNameError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      setNameError('O nome nao pode estar vazio.');
      return;
    }

    try {
      setSavingName(true);
      setNameError('');
      setNameSuccess('');

      await api.put(`/users/${profile?.id}`, { name });

      // Update auth store with new name
      if (authUser && accessToken && refreshToken && tenantSlug) {
        login({ ...authUser, name }, accessToken, refreshToken, tenantSlug);
      }

      setProfile((prev) => (prev ? { ...prev, name } : prev));
      setNameSuccess('Nome atualizado com sucesso!');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao atualizar nome.';
      setNameError(message);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmacao nao coincidem.');
      return;
    }

    try {
      setSavingPassword(true);

      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao alterar senha.';
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informacoes pessoais e senha</p>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 text-primary rounded-full flex items-center justify-center font-bold text-2xl">
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
          </div>
        </div>
      </div>

      {/* Edit Name Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Informacoes Pessoais</h3>
        </div>

        {nameSuccess && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {nameSuccess}
          </div>
        )}
        {nameError && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {nameError}
          </div>
        )}

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-500 bg-gray-50 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">O email nao pode ser alterado.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Funcao</label>
            <input
              type="text"
              value={getRoleLabel(profile?.role || '')}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-500 bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {savingName ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Salvar Nome
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Alterar Senha</h3>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {passwordError}
          </div>
        )}

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Digite sua senha atual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Digite a nova senha (min. 6 caracteres)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Confirme a nova senha"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {savingPassword ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
