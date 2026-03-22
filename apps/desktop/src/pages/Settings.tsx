import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Globe, Store, Clock, Truck, CreditCard, Bell,
  Printer, MessageCircle, WifiOff, Save, ExternalLink,
  ShoppingBag, UtensilsCrossed, RefreshCw, AlertCircle, CheckCircle2, XCircle, Loader2,
  Download, ArrowUpCircle,
} from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import {
  useGetTenantBySlugQuery, useUpdateTenantMutation,
  useGetWhatsappStatusQuery, useConnectWhatsappMutation, useDisconnectWhatsappMutation,
} from '@/api/api';
import { useAppSelector } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { cn } from '@/utils/cn';
import { env } from '@/config/env';
import PrinterManager from './PrinterManager';

const DAYS = [
  { key: 'monday', label: 'Segunda' }, { key: 'tuesday', label: 'Terca' },
  { key: 'wednesday', label: 'Quarta' }, { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' }, { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
];

const TABS = [
  { key: 'geral', label: 'Dados Gerais', icon: Store },
  { key: 'horarios', label: 'Horários', icon: Clock },
  { key: 'modos', label: 'Modos de Pedido', icon: Truck },
  { key: 'pagamento', label: 'Pagamento', icon: CreditCard },
  { key: 'parametros', label: 'Parâmetros', icon: SettingsIcon },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
  { key: 'impressora', label: 'Impressora', icon: Printer },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'desktop', label: 'Desktop', icon: Globe },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0', checked ? 'bg-primary' : 'bg-gray-300')}>
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

function SaveBtn({ onClick, loading, label }: { onClick: () => void; loading?: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading} className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors active:scale-95">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {label || 'Salvar'}
    </button>
  );
}


export default function Settings() {
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);
  const { data: tenant, refetch: refetchTenant } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [updateTenant, { isLoading: saving }] = useUpdateTenantMutation();

  const { data: waStatus, refetch: refetchWa } = useGetWhatsappStatusQuery();
  const [connectWa, { isLoading: connecting, data: connectData }] = useConnectWhatsappMutation();
  const [disconnectWa, { isLoading: disconnecting }] = useDisconnectWhatsappMutation();

  const notify = useNotify();

  const [activeTab, setActiveTab] = useState('geral');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [businessHours, setBusinessHours] = useState<Record<string, any>>({});
  const [orderModes, setOrderModes] = useState({ delivery: true, pickup: false, dine_in: false });
  const [paymentConfig, setPaymentConfig] = useState<Record<string, any>>({});
  const [cancelTimeLimit, setCancelTimeLimit] = useState(5);
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({ sound_enabled: true, sound_new_order: true, sound_out_for_delivery: true, sound_delivered: true, push_enabled: false });

  // Auto-update state
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'up-to-date' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateError, setUpdateError] = useState('');
  const currentVersion = '0.1.0';

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    try {
      const update = await check();
      if (update) {
        setUpdateVersion(update.version);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch {
      setUpdateStatus('up-to-date');
    }
  };

  const downloadAndInstall = async () => {
    setUpdateStatus('downloading');
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
      }
    } catch (err) {
      setUpdateError(String(err));
      setUpdateStatus('error');
    }
  };

  const [autoConfirm, setAutoConfirm] = useState(() => localStorage.getItem('desktop_auto_confirm') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('desktop_auto_print') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('desktop_sound') !== 'false');
  const [minimizeToTray, setMinimizeToTray] = useState(() => localStorage.getItem('desktop_minimize_tray') === 'true');
  const [paperWidth, setPaperWidth] = useState(() => parseInt(localStorage.getItem('menufacil_paper_width') || '48'));
  // API URL is now configured via VITE_ENV environment variable

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name || ''); setSlug(tenant.slug || ''); setPhone(tenant.phone || ''); setAddress(tenant.address || '');
    setMinOrder(String(tenant.min_order_value || ''));
    if (tenant.business_hours) setBusinessHours(tenant.business_hours);
    if (tenant.order_modes) setOrderModes(tenant.order_modes);
    if (tenant.payment_config) setPaymentConfig(tenant.payment_config);
    if (tenant.cancel_time_limit !== undefined) setCancelTimeLimit(tenant.cancel_time_limit);
    if (tenant.notification_settings) setNotifSettings(tenant.notification_settings);
  }, [tenant]);

  const ds = (key: string, value: string) => localStorage.setItem(key, value);

  const save = async (data: any) => {
    if (!tenant) return;
    await updateTenant({ id: tenant.id, data }).unwrap();
    refetchTenant();
    notify.success('Salvo com sucesso!');
  };

  return (
    <div className="h-full flex relative">

      <div className="w-52 shrink-0 border-r border-gray-200 bg-white p-3 space-y-0.5 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 px-3 py-2 mb-2">Configuracoes</h2>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors', activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50')}>
            <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">

          {activeTab === 'geral' && (<>
            <h3 className="text-base font-bold text-gray-900">Dados do Estabelecimento</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Nome</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Slug</label><div className="flex"><span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">menufacil.com/</span><input value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 px-4 py-2.5 rounded-r-xl border border-gray-200 text-sm font-mono" /></div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Telefone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Pedido mínimo (R$)</label><input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Endereço</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              <div className="flex justify-end"><SaveBtn onClick={() => save({ name, slug, phone, address, min_order_value: parseFloat(minOrder) || 0 })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'horarios' && (<>
            <h3 className="text-base font-bold text-gray-900">Horario de Funcionamento</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              {DAYS.map((day) => { const h = businessHours[day.key] || { open: false, openTime: '08:00', closeTime: '22:00' }; return (
                <div key={day.key} className="flex items-center gap-3">
                  <Toggle checked={!!h.open} onChange={(v) => setBusinessHours((p) => ({ ...p, [day.key]: { ...p[day.key], open: v, openTime: h.openTime || '08:00', closeTime: h.closeTime || '22:00' } }))} />
                  <span className="text-sm font-medium text-gray-700 w-20">{day.label}</span>
                  {h.open ? (<><input type="time" value={h.openTime || '08:00'} onChange={(e) => setBusinessHours((p) => ({ ...p, [day.key]: { ...p[day.key], openTime: e.target.value } }))} className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" /><span className="text-xs text-gray-400">ate</span><input type="time" value={h.closeTime || '22:00'} onChange={(e) => setBusinessHours((p) => ({ ...p, [day.key]: { ...p[day.key], closeTime: e.target.value } }))} className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm" /></>) : <span className="text-xs text-gray-400">Fechado</span>}
                </div>); })}
              <div className="flex justify-end pt-2"><SaveBtn onClick={() => save({ business_hours: businessHours })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'modos' && (<>
            <h3 className="text-base font-bold text-gray-900">Modos de Pedido</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              {[{ key: 'delivery', label: 'Entrega', desc: 'Pedidos para entrega', icon: Truck }, { key: 'pickup', label: 'Retirada', desc: 'Cliente retira no restaurante', icon: ShoppingBag }, { key: 'dine_in', label: 'Consumo no Local', desc: 'Mesas com QR Code', icon: UtensilsCrossed }].map((mode) => (
                <div key={mode.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><mode.icon className="w-5 h-5 text-primary" /></div><div><p className="text-sm font-medium text-gray-900">{mode.label}</p><p className="text-xs text-gray-500">{mode.desc}</p></div></div>
                  <Toggle checked={(orderModes as any)[mode.key]} onChange={(v) => setOrderModes((prev) => ({ ...prev, [mode.key]: v }))} />
                </div>
              ))}
              <div className="flex justify-end pt-2"><SaveBtn onClick={() => save({ order_modes: orderModes })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'pagamento' && (<>
            <h3 className="text-base font-bold text-gray-900">Configuracoes de Pagamento</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Tipo da chave PIX</label><select value={paymentConfig.pix_key_type || ''} onChange={(e) => setPaymentConfig((p) => ({ ...p, pix_key_type: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"><option value="">Selecionar...</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">Email</option><option value="phone">Telefone</option><option value="random">Chave Aleatoria</option></select></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Chave PIX</label><input value={paymentConfig.pix_key || ''} onChange={(e) => setPaymentConfig((p) => ({ ...p, pix_key: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Link de pagamento</label><input value={paymentConfig.payment_link_url || ''} onChange={(e) => setPaymentConfig((p) => ({ ...p, payment_link_url: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium text-gray-900">Aceita boleto</p></div><Toggle checked={!!paymentConfig.accepts_boleto} onChange={(v) => setPaymentConfig((p) => ({ ...p, accepts_boleto: v }))} /></div>
              <div className="flex justify-end"><SaveBtn onClick={() => save({ payment_config: paymentConfig })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'parametros' && (<>
            <h3 className="text-base font-bold text-gray-900">Parametros do Sistema</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Tempo limite para cancelamento (min)</label><input type="number" min={0} max={60} value={cancelTimeLimit} onChange={(e) => setCancelTimeLimit(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" /><p className="text-xs text-gray-400 mt-1">0 = desabilitado</p></div>
              <div className="flex justify-end"><SaveBtn onClick={() => save({ cancel_time_limit: cancelTimeLimit })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'notificacoes' && (<>
            <h3 className="text-base font-bold text-gray-900">Notificacoes</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              {[{ key: 'sound_enabled', label: 'Sons ativados', desc: 'Habilitar sons de notificação' }, { key: 'sound_new_order', label: 'Novo pedido', desc: 'Tocar som ao receber pedido' }, { key: 'sound_out_for_delivery', label: 'Saiu para entrega', desc: 'Som ao sair para entrega' }, { key: 'sound_delivered', label: 'Entregue', desc: 'Som ao confirmar entrega' }, { key: 'push_enabled', label: 'Push notifications', desc: 'Notificações push' }].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1"><div><p className="text-sm font-medium text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div><Toggle checked={!!(notifSettings as any)[item.key]} onChange={(v) => setNotifSettings((prev) => ({ ...prev, [item.key]: v }))} /></div>
              ))}
              <div className="flex justify-end pt-2"><SaveBtn onClick={() => save({ notification_settings: notifSettings })} loading={saving} /></div>
            </div>
          </>)}

          {activeTab === 'impressora' && (<>
            <h3 className="text-base font-bold text-gray-900">Impressora</h3>
            <PrinterManager />
          </>)}

          {activeTab === 'whatsapp' && (<>
            <h3 className="text-base font-bold text-gray-900">WhatsApp</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-3 h-3 rounded-full', waStatus?.connected ? 'bg-green-500' : 'bg-red-400')} />
                <span className="text-sm font-medium text-gray-900">{waStatus?.connected ? 'Conectado' : 'Desconectado'}</span>
                {waStatus?.phone && <span className="text-xs text-gray-500">{waStatus.phone}</span>}
              </div>
              {waStatus?.connected ? (
                <button onClick={() => disconnectWa()} disabled={disconnecting} className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"><WifiOff className="w-4 h-4" /> {disconnecting ? 'Desconectando...' : 'Desconectar'}</button>
              ) : (
                <div className="space-y-3">
                  <button onClick={() => connectWa()} disabled={connecting} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {connecting ? 'Conectando...' : 'Conectar WhatsApp'}</button>
                  {connectData?.qrCode && (<div className="bg-white border-2 border-gray-200 rounded-2xl p-4 text-center"><p className="text-sm font-medium text-gray-700 mb-3">Escaneie o QR Code</p><img src={connectData.qrCode} alt="QR Code" className="mx-auto w-48 h-48" /></div>)}
                </div>
              )}
              <button onClick={() => refetchWa()} className="text-xs text-primary font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar status</button>
            </div>
          </>)}

          {activeTab === 'desktop' && (<>
            <h3 className="text-base font-bold text-gray-900">Configuracoes do Desktop</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Ambiente</label><p className="text-sm text-gray-500">API: {env.apiUrl}</p></div>
              <div className="h-px bg-gray-100" />
              {[{ key: 'desktop_auto_confirm', label: 'Confirmar pedidos automaticamente', desc: 'Novos pedidos confirmados sem intervenção', value: autoConfirm, set: setAutoConfirm },
                { key: 'desktop_auto_print', label: 'Imprimir ao receber pedido', desc: 'Imprime automaticamente quando chegar', value: autoPrint, set: setAutoPrint },
                { key: 'desktop_sound', label: 'Sons de notificação', desc: 'Tocar som quando pedidos chegarem', value: soundEnabled, set: setSoundEnabled },
                { key: 'desktop_minimize_tray', label: 'Minimizar para bandeja', desc: 'App continua rodando ao fechar', value: minimizeToTray, set: setMinimizeToTray },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2"><div><p className="text-sm font-medium text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div><Toggle checked={item.value} onChange={(v) => item.set(v)} /></div>
              ))}
              <div className="h-px bg-gray-100" />
              <button onClick={() => window.open('https://menufacil.maistechtecnologia.com.br/login', '_blank')} className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"><ExternalLink className="w-4 h-4" /> Abrir Painel Web completo</button>
              <div className="flex justify-end pt-2">
                <SaveBtn onClick={() => {
                  ds('desktop_auto_confirm', String(autoConfirm));
                  ds('desktop_auto_print', String(autoPrint));
                  ds('desktop_sound', String(soundEnabled));
                  ds('desktop_minimize_tray', String(minimizeToTray));
                  notify.success('Configuracoes salvas!');
                }} label="Salvar Configuracoes" />
              </div>
            </div>

            {/* Auto-update section */}
            <h3 className="text-base font-bold text-gray-900 pt-4">Atualizacoes</h3>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Versao atual</p>
                  <p className="text-xs text-gray-500">v{currentVersion}</p>
                </div>
                <button
                  onClick={checkForUpdates}
                  disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                  className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors active:scale-95"
                >
                  {updateStatus === 'checking' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Verificar atualizações</>
                  )}
                </button>
              </div>

              {updateStatus === 'up-to-date' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700">Você está usando a versão mais recente.</p>
                </div>
              )}

              {updateStatus === 'available' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Nova versão disponível: v{updateVersion}</p>
                      <p className="text-xs text-blue-600">Atual: v{currentVersion}</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadAndInstall}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Atualizar agora
                  </button>
                </div>
              )}

              {updateStatus === 'downloading' && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <p className="text-sm text-blue-700">Baixando e instalando atualização...</p>
                </div>
              )}

              {updateStatus === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700">Erro ao verificar atualizações.</p>
                    {updateError && <p className="text-xs text-red-500 mt-1">{updateError}</p>}
                  </div>
                </div>
              )}
            </div>
          </>)}

        </div>
      </div>
    </div>
  );
}
