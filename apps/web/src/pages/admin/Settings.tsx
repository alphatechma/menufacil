import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useGetTenantBySlugQuery, useUpdateTenantMutation } from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
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
];

export default function Settings() {
  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: tenant, isLoading } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [updateTenant, { isLoading: isSaving, error: updateError }] = useUpdateTenantMutation();

  const [activeTab, setActiveTab] = useState('geral');
  const [successMessage, setSuccessMessage] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState('');

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

  if (isLoading) return <PageSpinner />;

  if (!tenantSlug) {
    return <ErrorAlert message="Slug do tenant nao encontrado. Faca login novamente." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500 mt-1">Gerencie as configuracoes do seu restaurante</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {!!updateError && (
        <ErrorAlert message="Erro ao salvar configuracoes. Tente novamente." className="mb-2" />
      )}

      <div className="bg-white rounded-xl border border-gray-200">
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

          {activeTab === 'horarios' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500">
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
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-48 shrink-0">
                        <Toggle
                          checked={hours.open}
                          onChange={(checked) => updateBusinessHour(day.key, 'open', checked)}
                        />
                        <span
                          className={`text-sm font-medium ${
                            hours.open ? 'text-gray-900' : 'text-gray-400'
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
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <span className="text-gray-400 text-sm">ate</span>
                          <input
                            type="time"
                            value={hours.closeTime}
                            onChange={(e) =>
                              updateBusinessHour(day.key, 'closeTime', e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 ml-auto">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-200">
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
