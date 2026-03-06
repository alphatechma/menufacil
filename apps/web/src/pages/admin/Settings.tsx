import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Volume2, VolumeX, Bell, Truck, Store, UtensilsCrossed, Crown, Package, Printer, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useGetTenantBySlugQuery, useUpdateTenantMutation } from '@/api/adminApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
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
import { PageSpinner } from '@/components/ui/Spinner';
import { selectNotificationSettings, updateSettings } from '@/store/slices/notificationSlice';
import { playTestSound } from '@/utils/notificationSounds';
import { isQzAvailable, listPrinters, getSelectedPrinter, selectPrinter, printOrder } from '@/utils/printService';

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
  { key: 'notificacoes', label: 'Notificacoes' },
  { key: 'plano', label: 'Plano' },
  { key: 'impressora', label: 'Impressora' },
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

export default function Settings() {
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

  // Printer state
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(null);
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [currentPrinter, setCurrentPrinter] = useState<string | null>(null);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerTestOk, setPrinterTestOk] = useState<boolean | null>(null);

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

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
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
    } catch {
      // Error is captured by RTK Query
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
    } catch {
      setHoursError('Erro ao salvar horarios de funcionamento.');
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
    } catch {
      // Revert on error
      setOrderModes((prev) => ({ ...prev, [mode]: !checked }));
    } finally {
      setSavingModes(false);
    }
  };

  const hasDineInModule = Array.isArray(modules) && modules.includes('dine_in');

  if (isLoading) return <PageSpinner />;

  if (!tenantSlug) {
    return <ErrorAlert message="Slug do tenant nao encontrado. Faca login novamente." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuracoes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie as configuracoes do seu restaurante</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {!!updateError && (
        <ErrorAlert message="Erro ao salvar configuracoes. Tente novamente." className="mb-2" />
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure como voce recebe notificacoes sobre novos pedidos e atualizacoes.
              </p>

              {/* Master Sound Toggle */}
              <FormCard>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Sons de Notificacao</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toque sons quando eventos importantes acontecerem</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {notifSettings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-primary" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Ativar sons</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Controle geral de todos os sons</p>
                      </div>
                    </div>
                    <Toggle
                      checked={notifSettings.soundEnabled}
                      onChange={(checked) => dispatch(updateSettings({ soundEnabled: checked }))}
                    />
                  </div>

                  {notifSettings.soundEnabled && (
                    <div className="ml-8 space-y-3 border-l-2 border-gray-100 dark:border-gray-700 pl-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Novo pedido</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Toca quando um novo pedido chega</p>
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
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Saiu para entrega</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Toca quando um pedido sai para entrega</p>
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
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Pedido entregue</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Toca quando um pedido e entregue</p>
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
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Notificacoes Push</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receba notificacoes mesmo quando o navegador esta em segundo plano</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Ativar notificacoes push</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">O navegador pedira permissao na primeira vez</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Entrega</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure as zonas de entrega na aba Delivery</p>
                      </div>
                    </div>
                    <Toggle
                      checked={orderModes.delivery}
                      onChange={(checked) => handleToggleOrderMode('delivery', checked)}
                      disabled={savingModes}
                    />
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700" />

                  {/* Pickup */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 bg-primary/10 rounded-xl">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Retirada no Balcao</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Clientes podem retirar o pedido no restaurante</p>
                      </div>
                    </div>
                    <Toggle
                      checked={orderModes.pickup}
                      onChange={(checked) => handleToggleOrderMode('pickup', checked)}
                      disabled={savingModes}
                    />
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700" />

                  {/* Dine In */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-xl',
                        hasDineInModule ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-700'
                      )}>
                        <UtensilsCrossed className={cn(
                          'w-5 h-5',
                          hasDineInModule ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          hasDineInModule ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                        )}>Consumo no Local</p>
                        {hasDineInModule ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mesas, comanda digital e reservas</p>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500">Disponivel no plano Enterprise</p>
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

          {activeTab === 'plano' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Veja os detalhes do plano contratado e os modulos disponiveis.
              </p>

              <FormCard>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {plan?.name || 'Sem plano'}
                    </h3>
                    {plan?.price != null && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        R$ {plan.price.toFixed(2).replace('.', ',')}/mes
                      </p>
                    )}
                  </div>
                </div>
              </FormCard>

              <FormCard>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Modulos Inclusos</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
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
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum modulo disponivel.</p>
                )}
              </FormCard>
            </div>
          )}

          {activeTab === 'impressora' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">
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

              <FormCard>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      printerAvailable === true ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700',
                    )}>
                      <Printer className={cn(
                        'w-5 h-5',
                        printerAvailable === true ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500',
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">QZ Tray</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {printerAvailable === null
                          ? 'Verificando...'
                          : printerAvailable
                          ? 'Conectado'
                          : 'Nao detectado — instale o QZ Tray'}
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

              {printerAvailable && (
                <FormCard>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Impressora Termica</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Selecione a impressora que sera usada para imprimir os pedidos automaticamente.
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
                              : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600',
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
                            currentPrinter === name ? 'text-primary' : 'text-gray-400 dark:text-gray-500',
                          )} />
                          <span className={cn(
                            'text-sm font-medium flex-1',
                            currentPrinter === name ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300',
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
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Nenhuma impressora encontrada. Clique em "Detectar" acima.
                    </p>
                  )}

                  {currentPrinter && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
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

              <FormCard>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Como funciona</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p>1. Instale o <strong>QZ Tray</strong> no computador do caixa/cozinha</p>
                  <p>2. Conecte a impressora termica (USB ou rede)</p>
                  <p>3. Clique em <strong>Detectar</strong> e selecione a impressora</p>
                  <p>4. Ao aceitar um pedido, ele sera impresso automaticamente</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Se o QZ Tray nao estiver instalado, o sistema usa o dialogo de impressao do navegador como fallback.
                </p>
              </FormCard>
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800'
                          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-48 shrink-0">
                        <Toggle
                          checked={hours.open}
                          onChange={(checked) => updateBusinessHour(day.key, 'open', checked)}
                        />
                        <span
                          className={`text-sm font-medium ${
                            hours.open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
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
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <span className="text-gray-400 dark:text-gray-500 text-sm">ate</span>
                          <input
                            type="time"
                            value={hours.closeTime}
                            onChange={(e) =>
                              updateBusinessHour(day.key, 'closeTime', e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
