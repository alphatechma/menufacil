import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Volume2,
  VolumeX,
  Printer,
  Bell,
  BellOff,
  Monitor,
  ExternalLink,
  Save,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/utils/cn';

const STORAGE_PREFIX = 'menufacil_desktop_';

function loadSetting(key: string, fallback: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch { /* */ }
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
        checked ? 'bg-orange-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function Settings() {
  const tenantSlug = useAppSelector((state) => state.auth.tenantSlug);

  const [apiUrl, setApiUrl] = useState(() => loadSetting('api_url', ''));
  const [autoConfirm, setAutoConfirm] = useState(() => loadSetting('auto_confirm', 'false') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => loadSetting('auto_print', 'false') === 'true');
  const [soundEnabled, setSoundEnabled] = useState(() => loadSetting('sound_enabled', 'true') === 'true');
  const [paperWidth, setPaperWidth] = useState(() => loadSetting('paper_width', '80'));
  const [minimizeToTray, setMinimizeToTray] = useState(() => loadSetting('minimize_to_tray', 'false') === 'true');
  const [saved, setSaved] = useState(false);

  const handleToggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    saveSetting(key, String(value));
  };

  const handleSaveApiUrl = () => {
    saveSetting('api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleOpenWebPanel = () => {
    const baseUrl = apiUrl || 'https://menufacil.maistechtecnologia.com.br';
    const url = tenantSlug ? `${baseUrl}/${tenantSlug}/admin` : baseUrl;
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Configuracoes</h1>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 pb-4">
        {/* API URL */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">URL da API</h3>
              <p className="text-xs text-gray-500">Endereco do servidor. Deixe vazio para usar o padrao.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://menufacil.maistechtecnologia.com.br"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            />
            <button
              onClick={handleSaveApiUrl}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-95',
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-orange-500 text-white hover:bg-orange-600',
              )}
            >
              {saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Toggles Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {/* Auto-confirm */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', autoConfirm ? 'bg-orange-100' : 'bg-gray-100')}>
                <Bell className={cn('w-5 h-5', autoConfirm ? 'text-orange-600' : 'text-gray-400')} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Confirmar pedidos automaticamente</p>
                <p className="text-xs text-gray-500">Novos pedidos serao confirmados sem intervencao manual</p>
              </div>
            </div>
            <ToggleSwitch
              checked={autoConfirm}
              onChange={(v) => handleToggle('auto_confirm', v, setAutoConfirm)}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Auto-print */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', autoPrint ? 'bg-orange-100' : 'bg-gray-100')}>
                <Printer className={cn('w-5 h-5', autoPrint ? 'text-orange-600' : 'text-gray-400')} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Imprimir ao receber pedido</p>
                <p className="text-xs text-gray-500">Imprime automaticamente quando um novo pedido chegar</p>
              </div>
            </div>
            <ToggleSwitch
              checked={autoPrint}
              onChange={(v) => handleToggle('auto_print', v, setAutoPrint)}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', soundEnabled ? 'bg-orange-100' : 'bg-gray-100')}>
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-orange-600" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sons de notificacao</p>
                <p className="text-xs text-gray-500">Tocar som quando novos pedidos chegarem</p>
              </div>
            </div>
            <ToggleSwitch
              checked={soundEnabled}
              onChange={(v) => handleToggle('sound_enabled', v, setSoundEnabled)}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Minimize to tray */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', minimizeToTray ? 'bg-orange-100' : 'bg-gray-100')}>
                <Monitor className={cn('w-5 h-5', minimizeToTray ? 'text-orange-600' : 'text-gray-400')} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Minimizar para bandeja</p>
                <p className="text-xs text-gray-500">Ao fechar, o app continua rodando na bandeja do sistema</p>
              </div>
            </div>
            <ToggleSwitch
              checked={minimizeToTray}
              onChange={(v) => handleToggle('minimize_to_tray', v, setMinimizeToTray)}
            />
          </div>
        </div>

        {/* Paper Width */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                <Printer className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Largura do papel</p>
                <p className="text-xs text-gray-500">Tamanho da bobina termica da impressora</p>
              </div>
            </div>
            <select
              value={paperWidth}
              onChange={(e) => {
                setPaperWidth(e.target.value);
                saveSetting('paper_width', e.target.value);
              }}
              className="px-3 py-2 border border-gray-200 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="80">80mm (padrao)</option>
              <option value="58">58mm (compacta)</option>
              <option value="57">57mm (maquininha)</option>
            </select>
          </div>
        </div>

        {/* Open Web Panel */}
        <button
          onClick={handleOpenWebPanel}
          className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-3 hover:bg-gray-50 transition-colors active:scale-[0.99]"
        >
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold text-gray-900">Abrir Painel Web</p>
            <p className="text-xs text-gray-500">Acessar o painel de administracao completo no navegador</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
