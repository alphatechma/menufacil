import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/authStore';
import { Save, User } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const [success, setSuccess] = useState('');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSuccess('Configuracoes salvas com sucesso');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 text-primary rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary mt-1">
              Super Admin
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
            <input
              type="text"
              defaultValue={user?.name}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email"
              defaultValue={user?.email}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
            />
          </div>

          <hr className="border-gray-200" />

          <h3 className="text-sm font-semibold text-gray-900">Alterar Senha</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha Atual</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova Senha</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
