import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-400">
      <SettingsIcon className="mb-3 h-12 w-12" />
      <h1 className="text-xl font-semibold text-gray-700">Configurações</h1>
      <p className="mt-1 text-sm">Configurações do sistema</p>
    </div>
  );
}
