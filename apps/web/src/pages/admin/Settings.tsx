import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Volume2, VolumeX, Bell, Truck, Store, UtensilsCrossed, Crown, Package, Printer, Check, AlertCircle, RefreshCw, Copy, ChefHat, Download, MessageCircle, QrCode, WifiOff, ChevronUp, ChevronDown } from 'lucide-react';
import { useGetTenantBySlugQuery, useUpdateTenantMutation, useConnectWhatsappMutation, useDisconnectWhatsappMutation, useGetWhatsappStatusQuery } from '@/api/adminApi';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { cn } from '@/utils/cn';
import { settingsSchema, type SettingsFormData } from '@/schemas/admin/settingsSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SettingsPageSkeleton } from '@/components/ui/Skeleton';
import { selectNotificationSettings, updateSettings } from '@/store/slices/notificationSlice';
import { playTestSound } from '@/utils/notificationSounds';
import { isQzAvailable, listPrinters, getSelectedPrinter, selectPrinter, printOrder, getReceiptLayout, saveReceiptLayout, getFooterMessage, setFooterMessage, type ReceiptSection } from '@/utils/printService';

interface BusinessHours {
  [day: string]: {
    open: boolean;
    openTime: string;
    closeTime: string;
  };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terca-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: true, openTime: '08:00', closeTime: '22:00' },
  tuesday: { open: true, openTime: '08:00', closeTime: '22:00' },
  wednesday: { open: true, openTime: '08:00', closeTime: '22:00' },
  thursday: { open: true, openTime: '08:00', closeTime: '22:00' },
  friday: { open: true, openTime: '08:00', closeTime: '23:00' },
  saturday: { open: true, openTime: '09:00', closeTime: '23:00' },
  sunday: { open: true, openTime: '09:00', closeTime: '21:00' },
};

const SETTINGS_TABS = [
  { key: 'geral', label: 'Dados Gerais' },
  { key: 'horarios', label: 'Horario de Funcionamento' },
  { key: 'modos', label: 'Modos de Pedido' },
  { key: 'parametros', label: 'Parametros' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'notificacoes', label: 'Notificacoes' },
  { key: 'plano', label: 'Plano' },
  { key: 'impressora', label: 'Impressora' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

const MODULE_LABELS: Record<string, string> = {
  product: 'Produtos',
  category: 'Categorias',
  order: 'Pedidos',
  customer: 'Clientes',
  delivery: 'Entregas',
  coupons: 'Cupons',
  loyalty: 'Fidelidade',
  kds: 'Cozinha (KDS)',
  reports: 'Relatorios',
  delivery_driver: 'Entregadores',
  pickup: 'Retirada',
  dine_in: 'Consumo no Local',
};

function WhatsappSettingsTab() {
  const navigate = useNavigate();
  const { data: status, refetch } = useGetWhatsappStatusQuery();
  const [connect, { isLoading: connecting, data: connectData }] = useConnectWhatsappMutation();
  const [disconnect, { isLoading: disconnecting }] = useDisconnectWhatsappMutation();

  const isConnected = status?.status === 'connected';
  const isConnecting = status?.status === 'connecting' || connecting;

  useEffect(() => {
    if (!isConnecting) return;
    const interval = setInterval(() => refetch(), 3000);
    return () => clearInterval(interval);
  }, [isConnecting, refetch]);

  return (
    <FormCard>
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">WhatsApp</h3>
          <p className="text-sm text-muted-foreground">Conecte seu numero de WhatsApp para enviar mensagens automaticas aos clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('w-3 h-3 rounded-full', isConnected ? 'bg-success' : isConnecting ? 'bg-warning animate-pulse' : 'bg-gray-300')} />
          <span className="text-sm font-medium text-foreground">
            {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
          </span>
          {status?.phone_number && (
            <span className="text-sm text-muted-foreground">({status.phone_number})</span>
          )}
        </div>

        {isConnecting && connectData?.qrcode && (
          <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-xl">
            <p className="text-sm text-muted-foreground">Escaneie o QR Code com seu WhatsApp</p>
            <img
              src={connectData.qrcode.startsWith('data:') ? connectData.qrcode : `data:image/png;base64,${connectData.qrcode}`}
              alt="QR Code WhatsApp"
              className="w-64 h-64 rounded-lg"
            />
            {connectData?.pairingCode && (
              <p className="text-sm text-muted-foreground">
                Codigo de pareamento: <span className="font-mono font-bold text-foreground">{connectData.pairingCode}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <Button onClick={() => connect()} loading={connecting} disabled={connecting}>
              <QrCode className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          ) : (
            <Button variant="danger" onClick={() => disconnect()} loading={disconnecting}>
              <WifiOff className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          )}
        </div>

        {isConnected && (
          <button
            onClick={() => navigate('/admin/whatsapp')}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Gerenciar Templates e Conversas
          </button>
        )}
      </div>
    </FormCard>
  );
}

export default function Settings() {
  const notify = useNotify();
  const dispatch = useAppDispatch();
  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const modules = useAppSelector((state) => state.adminAuth.modules);
  const plan = useAppSelector((state) => state.adminAuth.plan);
  const notifSettings = useAppSelector(selectNotificationSettings);
  const { data: tenant, isLoading } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [updateTenant, { isLoading: isSaving, error: updateError }] = useUpdateTenantMutation();

  const [activeTab, setActiveTab] = useState('geral');
  const [successMessage, setSuccessMessage] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState('');
  const [orderModes, setOrderModes] = useState<Record<string, boolean>>({
    delivery: false,
    pickup: false,
    dine_in: false,
  });
  const [savingModes, setSavingModes] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<Record<string, any>>({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [cancelTimeLimit, setCancelTimeLimit] = useState(5);
  const [savingParams, setSavingParams] = useState(false);

  // Printer state
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(null);
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [currentPrinter, setCurrentPrinter] = useState<string | null>(null);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerTestOk, setPrinterTestOk] = useState<boolean | null>(null);

  // Printer settings (persisted in localStorage)
  const [autoPrint, setAutoPrint] = useState(() => {
    try { return localStorage.getItem('menufacil_auto_print') !== 'false'; } catch { return true; }
  });
  const [printCopies, setPrintCopies] = useState(() => {
    try { return parseInt(localStorage.getItem('menufacil_print_copies') || '1', 10); } catch { return 1; }
  });
  const [printKitchen, setPrintKitchen] = useState(() => {
    try { return localStorage.getItem('menufacil_print_kitchen') === 'true'; } catch { return false; }
  });
  const [kitchenPrinter, setKitchenPrinter] = useState<string | null>(() => {
    try { return localStorage.getItem('menufacil_kitchen_printer'); } catch { return null; }
  });
  const [paperWidth, setPaperWidthState] = useState(() => {
    try { return parseInt(localStorage.getItem('menufacil_paper_width') || '48', 10); } catch { return 48; }
  });
  const [receiptSections, setReceiptSections] = useState<ReceiptSection[]>(getReceiptLayout);
  const [footerMsg, setFooterMsg] = useState(getFooterMessage);

  const savePrinterSetting = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  };

  const { control, handleSubmit, reset } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      min_order_value: null,
    },
  });

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? '',
        slug: tenant.slug ?? '',
        phone: tenant.phone ?? '',
        address: tenant.address ?? '',
        min_order_value: tenant.min_order_value ?? null,
      });
      if (tenant.order_modes) {
        setOrderModes({
          delivery: !!tenant.order_modes.delivery,
          pickup: !!tenant.order_modes.pickup,
          dine_in: !!tenant.order_modes.dine_in,
        });
      }
      if (tenant.payment_config) {
        setPaymentConfig(tenant.payment_config);
      }
      if (tenant.cancel_time_limit !== undefined) {
        setCancelTimeLimit(tenant.cancel_time_limit);
      }
      if (tenant.business_hours && Object.keys(tenant.business_hours).length > 0) {
        // Normalize legacy format: { open: "11:00", close: "23:00" } → { open: true, openTime: "11:00", closeTime: "23:00" }
        const normalized: BusinessHours = {};
        for (const [day, val] of Object.entries(tenant.business_hours as Record<string, any>)) {
          if (typeof val.openTime === 'string') {
            // Already in correct format
            normalized[day] = val;
          } else {
            // Legacy format: open/close are time strings, or open is boolean with close
            const isOpen = typeof val.open === 'boolean' ? val.open : !!val.open;
            normalized[day] = {
              open: isOpen,
              openTime: typeof val.open === 'string' ? val.open : (val.openTime || '08:00'),
              closeTime: val.close || val.closeTime || '22:00',
            };
          }
        }
        setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...normalized });
      }
    }
  }, [tenant, reset]);

  // Auto-detect printer when switching to impressora tab
  useEffect(() => {
    if (activeTab !== 'impressora' || printerAvailable !== null) return;
    let cancelled = false;
    (async () => {
      setPrinterLoading(true);
      try {
        const available = await isQzAvailable();
        if (cancelled) return;
        setPrinterAvailable(available);
        if (available) {
          const printers = await listPrinters();
          if (cancelled) return;
          setPrinterList(printers);
          const selected = await getSelectedPrinter();
          if (cancelled) return;
          setCurrentPrinter(selected);
        }
      } catch {
        if (!cancelled) setPrinterAvailable(false);
      }
      if (!cancelled) setPrinterLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeTab, printerAvailable]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    notify.success(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const onSubmitGeral = async (data: SettingsFormData) => {
    if (!tenant) return;
    try {
      await updateTenant({
        id: tenant.id,
        data: {
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          min_order_value: data.min_order_value ?? null,
        },
      }).unwrap();
      showSuccess('Configuracoes gerais salvas com sucesso!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao salvar configuracoes gerais.');
    }
  };

  const handleSaveHorarios = async () => {
    if (!tenant) return;
    try {
      setSavingHours(true);
      setHoursError('');
      await updateTenant({
        id: tenant.id,
        data: { business_hours: businessHours },
      }).unwrap();
      showSuccess('Horarios de funcionamento salvos com sucesso!');
    } catch (err: any) {
      setHoursError('Erro ao salvar horarios de funcionamento.');
      notify.error(err?.data?.message || 'Erro ao salvar horarios de funcionamento.');
    } finally {
      setSavingHours(false);
    }
  };

  const updateBusinessHour = (day: string, field: string, value: string | boolean) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleToggleOrderMode = async (mode: string, checked: boolean) => {
    if (!tenant) return;
    const updated = { ...orderModes, [mode]: checked };
    setOrderModes(updated);
    try {
      setSavingModes(true);
      await updateTenant({
        id: tenant.id,
        data: { order_modes: updated },
      }).unwrap();
      showSuccess('Modo de pedido atualizado com sucesso!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao atualizar modo de pedido.');
      setOrderModes((prev) => ({ ...prev, [mode]: !checked }));
    } finally {
      setSavingModes(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    if (!tenant) return;
    try {
      setSavingPayment(true);
      await updateTenant({
        id: tenant.id,
        data: { payment_config: paymentConfig },
      }).unwrap();
      showSuccess('Configuracoes de pagamento salvas com sucesso!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao salvar configuracoes de pagamento.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveParams = async () => {
    if (!tenant) return;
    try {
      setSavingParams(true);
      await updateTenant({
        id: tenant.id,
        data: { cancel_time_limit: cancelTimeLimit },
      }).unwrap();
      showSuccess('Parametros salvos com sucesso!');
    } catch (err: any) { notify.error(err?.data?.message || 'Erro ao salvar parametros.'); }
    finally { setSavingParams(false); }
  };

  const hasDineInModule = Array.isArray(modules) && modules.includes('dine_in');

  if (isLoading) return <SettingsPageSkeleton />;

  if (!tenantSlug) {
    return <ErrorAlert message="Slug do tenant nao encontrado. Faca login novamente." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configuracoes do seu restaurante</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {!!updateError && (
        <ErrorAlert message="Erro ao salvar configuracoes. Tente novamente." className="mb-2" />
      )}

      <div className="bg-card rounded-xl border border-border">
        <Tabs
          tabs={SETTINGS_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="px-4 pt-2"
        />

        <div className="p-6">
          {activeTab === 'geral' && (
            <form onSubmit={handleSubmit(onSubmitGeral)}>
              <FormCard
                footer={
                  <Button type="submit" loading={isSaving}>
                    <Save className="w-4 h-4" />
                    Salvar Configuracoes
                  </Button>
                }
              >
                <FormField control={control} name="name" label="Nome do restaurante" required>
                  {(field) => (
                    <Input {...field} placeholder="Nome do restaurante" />
                  )}
                </FormField>

                <FormField control={control} name="slug" label="Endereco (slug)">
                  {(field) => (
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-muted-foreground text-sm font-medium">
                        menufacil.com/
                      </span>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="meu-restaurante"
                        className="rounded-l-none font-mono text-sm"
                      />
                    </div>
                  )}
                </FormField>

                <FormField control={control} name="phone" label="Telefone">
                  {(field) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="(11) 99999-9999"
                    />
                  )}
                </FormField>

                <FormField control={control} name="address" label="Endereco">
                  {(field) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
                    />
                  )}
                </FormField>

                <FormField control={control} name="min_order_value" label="Valor minimo do pedido (R$)">
                  {(field) => (
                    <PriceInput
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? null : parseFloat(val));
                      }}
                      placeholder="0,00"
                    />
                  )}
                </FormField>
              </FormCard>
            </form>
          )}

          {activeTab === 'notificacoes' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configure como voce recebe notificacoes sobre novos pedidos e atualizacoes.
              </p>

              {/* Master Sound Toggle */}
              <FormCard>
                <div>
                  <h3 className="text-base font-bold text-foreground">Sons de Notificacao</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Toque sons quando eventos importantes acontecerem</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {notifSettings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-primary" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">Ativar sons</p>
                        <p className="text-xs text-muted-foreground">Controle geral de todos os sons</p>
                      </div>
                    </div>
                    <Toggle
                      checked={notifSettings.soundEnabled}
                      onChange={(checked) => dispatch(updateSettings({ soundEnabled: checked }))}
                    />
                  </div>

                  {notifSettings.soundEnabled && (
                    <div className="ml-8 space-y-3 border-l-2 border-border pl-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Novo pedido</p>
                          <p className="text-xs text-muted-foreground">Toca quando um novo pedido chega</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTestSound('new_order')}
                            className="text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            Testar
                          </button>
                          <Toggle
                            checked={notifSettings.soundNewOrder}
                            onChange={(checked) => dispatch(updateSettings({ soundNewOrder: checked }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Saiu para entrega</p>
                          <p className="text-xs text-muted-foreground">Toca quando um pedido sai para entrega</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTestSound('out_for_delivery')}
                            className="text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            Testar
                          </button>
                          <Toggle
                            checked={notifSettings.soundOutForDelivery}
                            onChange={(checked) => dispatch(updateSettings({ soundOutForDelivery: checked }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Pedido entregue</p>
                          <p className="text-xs text-muted-foreground">Toca quando um pedido e entregue</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTestSound('delivered')}
                            className="text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            Testar
                          </button>
                          <Toggle
                            checked={notifSettings.soundDelivered}
                            onChange={(checked) => dispatch(updateSettings({ soundDelivered: checked }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </FormCard>

              {/* Push Notifications */}
              <FormCard>
                <div>
                  <h3 className="text-base font-bold text-foreground">Notificacoes Push</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Receba notificacoes mesmo quando o navegador esta em segundo plano</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Ativar notificacoes push</p>
                      <p className="text-xs text-muted-foreground">O navegador pedira permissao na primeira vez</p>
                    </div>
                  </div>
                  <Toggle
                    checked={notifSettings.pushEnabled}
                    onChange={async (checked) => {
                      if (checked && 'Notification' in window) {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') return;
                      }
                      dispatch(updateSettings({ pushEnabled: checked }));
                    }}
                  />
                </div>
              </FormCard>
            </div>
          )}

          {activeTab === 'modos' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Escolha quais modos de pedido estao disponiveis para seus clientes.
              </p>

              <FormCard>
                <div className="space-y-4">
                  {/* Delivery */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 bg-primary/10 rounded-xl">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Entrega</p>
                        <p className="text-xs text-muted-foreground">Configure as zonas de entrega na aba Delivery</p>
                      </div>
                    </div>
                    <Toggle
                      checked={orderModes.delivery}
                      onChange={(checked) => handleToggleOrderMode('delivery', checked)}
                      disabled={savingModes}
                    />
                  </div>

                  <div className="h-px bg-border" />

                  {/* Pickup */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 bg-primary/10 rounded-xl">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Retirada no Balcao</p>
                        <p className="text-xs text-muted-foreground">Clientes podem retirar o pedido no restaurante</p>
                      </div>
                    </div>
                    <Toggle
                      checked={orderModes.pickup}
                      onChange={(checked) => handleToggleOrderMode('pickup', checked)}
                      disabled={savingModes}
                    />
                  </div>

                  <div className="h-px bg-border" />

                  {/* Dine In */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-xl',
                        hasDineInModule ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <UtensilsCrossed className={cn(
                          'w-5 h-5',
                          hasDineInModule ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          hasDineInModule ? 'text-foreground' : 'text-muted-foreground'
                        )}>Consumo no Local</p>
                        {hasDineInModule ? (
                          <p className="text-xs text-muted-foreground">Mesas, comanda digital e reservas</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Disponivel no plano Enterprise</p>
                        )}
                      </div>
                    </div>
                    <Toggle
                      checked={orderModes.dine_in}
                      onChange={(checked) => handleToggleOrderMode('dine_in', checked)}
                      disabled={savingModes || !hasDineInModule}
                    />
                  </div>
                </div>
              </FormCard>
            </div>
          )}

          {activeTab === 'parametros' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configure parametros gerais do sistema.
              </p>

              <FormCard>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Tempo limite para cancelamento pelo cliente (minutos)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={cancelTimeLimit}
                      onChange={(e) => setCancelTimeLimit(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tempo maximo (em minutos) que o cliente pode cancelar o pedido apos a criacao.
                      Apos esse tempo, apenas o restaurante pode cancelar. Defina 0 para desabilitar o cancelamento pelo cliente.
                    </p>
                  </div>
                </div>
              </FormCard>

              <div className="flex justify-end">
                <Button onClick={handleSaveParams} loading={savingParams}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Parametros
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'pagamento' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configure as informacoes de pagamento usadas no PDV e nas mensagens do WhatsApp.
              </p>

              <FormCard>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Tipo da chave PIX</label>
                    <select
                      value={paymentConfig.pix_key_type || ''}
                      onChange={(e) => setPaymentConfig((prev: Record<string, any>) => ({ ...prev, pix_key_type: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Selecionar...</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatoria</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Chave PIX</label>
                    <Input
                      value={paymentConfig.pix_key || ''}
                      onChange={(e) => setPaymentConfig((prev: Record<string, any>) => ({ ...prev, pix_key: e.target.value }))}
                      placeholder="CPF, CNPJ, email ou chave aleatoria"
                    />
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Link de pagamento (gateway)</label>
                    <Input
                      value={paymentConfig.payment_link_url || ''}
                      onChange={(e) => setPaymentConfig((prev: Record<string, any>) => ({ ...prev, payment_link_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">URL do gateway de pagamento, se houver.</p>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Aceita boleto</p>
                      <p className="text-xs text-muted-foreground">Habilitar pagamento via boleto</p>
                    </div>
                    <Toggle
                      checked={!!paymentConfig.accepts_boleto}
                      onChange={(checked) => setPaymentConfig((prev: Record<string, any>) => ({ ...prev, accepts_boleto: checked }))}
                    />
                  </div>
                </div>
              </FormCard>

              <div className="flex justify-end">
                <Button onClick={handleSavePaymentConfig} loading={savingPayment}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Pagamento
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'plano' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Veja os detalhes do plano contratado e os modulos disponiveis.
              </p>

              <FormCard>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {plan?.name || 'Sem plano'}
                    </h3>
                    {plan?.price != null && (
                      <p className="text-sm text-muted-foreground">
                        R$ {plan.price.toFixed(2).replace('.', ',')}/mes
                      </p>
                    )}
                  </div>
                </div>
              </FormCard>

              <FormCard>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Modulos Inclusos</h3>
                  <p className="text-xs text-muted-foreground">
                    Funcionalidades disponiveis no seu plano atual
                  </p>
                </div>
                {modules.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {modules.map((mod) => (
                      <div
                        key={mod}
                        className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                      >
                        <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {MODULE_LABELS[mod] || mod}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum modulo disponivel.</p>
                )}
              </FormCard>
            </div>
          )}

          {activeTab === 'impressora' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configure a impressora termica para impressao automatica de pedidos.
                Necessario instalar o{' '}
                <a
                  href="https://qz.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  QZ Tray
                </a>{' '}
                na maquina.
              </p>

              {/* QZ Tray Connection Status */}
              <FormCard>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      printerAvailable === true ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted',
                    )}>
                      <Printer className={cn(
                        'w-5 h-5',
                        printerAvailable === true ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">QZ Tray</p>
                      <p className="text-xs text-muted-foreground">
                        {printerAvailable === null
                          ? 'Verificando...'
                          : printerAvailable
                          ? 'Conectado'
                          : 'Nao detectado — verifique se o QZ Tray esta rodando e se o certificado foi adicionado'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={printerLoading}
                    onClick={async () => {
                      setPrinterLoading(true);
                      setPrinterTestOk(null);
                      try {
                        const available = await isQzAvailable();
                        setPrinterAvailable(available);
                        if (available) {
                          const printers = await listPrinters();
                          setPrinterList(printers);
                          const selected = await getSelectedPrinter();
                          setCurrentPrinter(selected);
                          showSuccess('Conectado ao QZ Tray com sucesso! ' + printers.length + ' impressora(s) encontrada(s).');
                        }
                      } catch {
                        setPrinterAvailable(false);
                      }
                      setPrinterLoading(false);
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Detectar
                  </Button>
                </div>
              </FormCard>

              {/* Printer Selection */}
              {printerAvailable && (
                <FormCard>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Impressora do Caixa</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Impressora principal usada para imprimir cupons e recibos dos pedidos.
                    </p>
                  </div>

                  {printerList.length > 0 ? (
                    <div className="space-y-2">
                      {printerList.map((name) => (
                        <label
                          key={name}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                            currentPrinter === name
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-border/80',
                          )}
                        >
                          <input
                            type="radio"
                            name="printer"
                            value={name}
                            checked={currentPrinter === name}
                            onChange={() => {
                              selectPrinter(name);
                              setCurrentPrinter(name);
                            }}
                            className="sr-only"
                          />
                          <Printer className={cn(
                            'w-5 h-5',
                            currentPrinter === name ? 'text-primary' : 'text-muted-foreground',
                          )} />
                          <span className={cn(
                            'text-sm font-medium flex-1',
                            currentPrinter === name ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {name}
                          </span>
                          {currentPrinter === name && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma impressora encontrada. Clique em "Detectar" acima.
                    </p>
                  )}

                  {currentPrinter && (
                    <div className="pt-4 border-t border-border flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setPrinterTestOk(null);
                          const testOrder = {
                            id: 'test',
                            order_number: 999,
                            order_type: 'delivery',
                            created_at: new Date().toISOString(),
                            customer: { name: 'Teste Impressao', phone: '(11) 99999-0000' },
                            items: [
                              { quantity: 2, product_name: 'X-Burger Especial', unit_price: 29.9, extras: [{ name: 'Bacon extra', price: 5 }] },
                              { quantity: 1, product_name: 'Refrigerante 600ml', unit_price: 8.0, extras: [] },
                            ],
                            subtotal: 72.8,
                            total: 72.8,
                            payment_method: 'pix',
                          };
                          const ok = await printOrder(testOrder, tenant?.name);
                          setPrinterTestOk(ok);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir Teste
                      </Button>
                      {printerTestOk === true && (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Impresso com sucesso!
                        </span>
                      )}
                      {printerTestOk === false && (
                        <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Usou fallback do navegador
                        </span>
                      )}
                    </div>
                  )}
                </FormCard>
              )}

              {/* Kitchen Printer */}
              {printerAvailable && printerList.length > 0 && (
                <FormCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center',
                        printKitchen ? 'bg-primary/10' : 'bg-muted',
                      )}>
                        <ChefHat className={cn(
                          'w-5 h-5',
                          printKitchen ? 'text-primary' : 'text-muted-foreground',
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Impressora da Cozinha</p>
                        <p className="text-xs text-muted-foreground">Imprimir via separada para a cozinha ao aceitar pedido</p>
                      </div>
                    </div>
                    <Toggle
                      checked={printKitchen}
                      onChange={(checked) => {
                        setPrintKitchen(checked);
                        savePrinterSetting('menufacil_print_kitchen', String(checked));
                      }}
                    />
                  </div>

                  {printKitchen && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {printerList.map((name) => (
                        <label
                          key={`kitchen-${name}`}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                            kitchenPrinter === name
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-border/80',
                          )}
                        >
                          <input
                            type="radio"
                            name="kitchen-printer"
                            value={name}
                            checked={kitchenPrinter === name}
                            onChange={() => {
                              setKitchenPrinter(name);
                              savePrinterSetting('menufacil_kitchen_printer', name);
                            }}
                            className="sr-only"
                          />
                          <ChefHat className={cn(
                            'w-5 h-5',
                            kitchenPrinter === name ? 'text-primary' : 'text-muted-foreground',
                          )} />
                          <span className={cn(
                            'text-sm font-medium flex-1',
                            kitchenPrinter === name ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {name}
                          </span>
                          {kitchenPrinter === name && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </FormCard>
              )}

              {/* Print Options */}
              <FormCard>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Opcoes de Impressao</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Configure o comportamento da impressao de pedidos.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Auto-print toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center',
                        autoPrint ? 'bg-primary/10' : 'bg-muted',
                      )}>
                        <Printer className={cn(
                          'w-5 h-5',
                          autoPrint ? 'text-primary' : 'text-muted-foreground',
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Impressao automatica</p>
                        <p className="text-xs text-muted-foreground">Imprimir automaticamente ao aceitar pedido</p>
                      </div>
                    </div>
                    <Toggle
                      checked={autoPrint}
                      onChange={(checked) => {
                        setAutoPrint(checked);
                        savePrinterSetting('menufacil_auto_print', String(checked));
                      }}
                    />
                  </div>

                  <div className="h-px bg-border" />

                  {/* Number of copies */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
                        <Copy className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Numero de copias</p>
                        <p className="text-xs text-muted-foreground">Quantidade de vias impressas por pedido</p>
                      </div>
                    </div>
                    <select
                      value={printCopies}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPrintCopies(val);
                        savePrinterSetting('menufacil_print_copies', String(val));
                      }}
                      className="px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value={1}>1 via</option>
                      <option value={2}>2 vias</option>
                      <option value={3}>3 vias</option>
                    </select>
                  </div>
                </div>

                  {/* Paper width */}
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
                        <Printer className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Largura do papel</p>
                        <p className="text-xs text-muted-foreground">Tamanho da bobina termica</p>
                      </div>
                    </div>
                    <select
                      value={paperWidth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPaperWidthState(val);
                        savePrinterSetting('menufacil_paper_width', String(val));
                      }}
                      className="px-3 py-2 border border-border bg-card text-foreground rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value={48}>80mm (PDV/Fiscal)</option>
                      <option value={32}>58mm (Compacta)</option>
                      <option value={30}>57mm (Maquininha)</option>
                    </select>
                  </div>
              </FormCard>

              {/* Receipt Layout Editor */}
              <FormCard>
                <div className="flex items-center gap-2 mb-1">
                  <Printer className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Layout do Recibo</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Ative/desative e reordene as secoes do recibo impresso.</p>

                <div className="space-y-1">
                  {receiptSections.map((section, index) => (
                    <div key={section.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/50">
                      <Toggle
                        checked={section.enabled}
                        onChange={(checked) => {
                          const updated = receiptSections.map((s, i) => i === index ? { ...s, enabled: checked } : s);
                          setReceiptSections(updated);
                          saveReceiptLayout(updated);
                        }}
                      />
                      <span className={`text-xs flex-1 ${section.enabled ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {section.label}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            const updated = [...receiptSections];
                            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                            setReceiptSections(updated);
                            saveReceiptLayout(updated);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={index === receiptSections.length - 1}
                          onClick={() => {
                            const updated = [...receiptSections];
                            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                            setReceiptSections(updated);
                            saveReceiptLayout(updated);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-foreground mb-1 block">Mensagem do rodape</label>
                  <Input
                    value={footerMsg}
                    onChange={(e) => {
                      setFooterMsg(e.target.value);
                      setFooterMessage(e.target.value);
                    }}
                    placeholder="Obrigado pela preferencia!"
                    className="text-xs"
                  />
                </div>
              </FormCard>

              {/* Setup Instructions */}
              <FormCard>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Como configurar</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
                    <div>
                      <p>Baixe e instale o <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">QZ Tray</a> no computador</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
                    <div>
                      <p>Execute o script de configuracao automatica:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <a href="/api/qz-tray/setup-script?os=windows" download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                          <Download className="w-3.5 h-3.5" />Windows (.bat)
                        </a>
                        <a href="/api/qz-tray/setup-script?os=linux" download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                          <Download className="w-3.5 h-3.5" />Linux (.sh)
                        </a>
                        <a href="/api/qz-tray/setup-script?os=macos" download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                          <Download className="w-3.5 h-3.5" />macOS (.sh)
                        </a>
                      </div>
                      <p className="text-xs mt-2 text-muted-foreground">O script instala o certificado e reinicia o QZ Tray automaticamente. No Windows, execute como Administrador.</p>
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-primary hover:underline">Configuracao manual</summary>
                        <div className="mt-1 text-xs space-y-1">
                          <p>1. Baixe o <a href="/api/qz-tray/certificate/download" download className="text-primary font-medium hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" />certificado</a></p>
                          <p>2. Copie para a pasta <code className="px-1 py-0.5 bg-muted rounded">auth/</code> do QZ Tray:</p>
                          <p className="pl-3">Windows: <code className="px-1 py-0.5 bg-muted rounded">C:\Program Files\QZ Tray\auth\</code></p>
                          <p className="pl-3">Linux: <code className="px-1 py-0.5 bg-muted rounded">/opt/qz-tray/auth/</code></p>
                          <p className="pl-3">macOS: <code className="px-1 py-0.5 bg-muted rounded">/Applications/QZ Tray.app/Contents/Resources/auth/</code></p>
                          <p>3. Reinicie o QZ Tray</p>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
                    <p>Conecte a impressora termica (USB ou rede) e clique em <strong>Detectar</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">4</span>
                    <p>Selecione a impressora e faca um teste de impressao</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted rounded-xl">
                  Se o QZ Tray nao estiver instalado, o sistema usa o dialogo de impressao do navegador como fallback.
                </p>
              </FormCard>
            </div>
          )}

          {activeTab === 'whatsapp' && <WhatsappSettingsTab />}

          {activeTab === 'horarios' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configure os horarios de funcionamento do seu restaurante para cada dia da semana.
              </p>

              {hoursError && <ErrorAlert message={hoursError} />}

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const hours = businessHours[day.key] || {
                    open: false,
                    openTime: '08:00',
                    closeTime: '22:00',
                  };
                  return (
                    <div
                      key={day.key}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-colors ${
                        hours.open
                          ? 'border-border bg-card'
                          : 'border-border bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-48 shrink-0">
                        <Toggle
                          checked={hours.open}
                          onChange={(checked) => updateBusinessHour(day.key, 'open', checked)}
                        />
                        <span
                          className={`text-sm font-medium ${
                            hours.open ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {day.label}
                        </span>
                      </div>

                      {hours.open ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={hours.openTime}
                            onChange={(e) =>
                              updateBusinessHour(day.key, 'openTime', e.target.value)
                            }
                            className="px-3 py-2 border border-border bg-card text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <span className="text-muted-foreground text-sm">ate</span>
                          <input
                            type="time"
                            value={hours.closeTime}
                            onChange={(e) =>
                              updateBusinessHour(day.key, 'closeTime', e.target.value)
                            }
                            className="px-3 py-2 border border-border bg-card text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground ml-auto">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSaveHorarios} loading={savingHours}>
                  <Save className="w-4 h-4" />
                  Salvar Horarios
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
