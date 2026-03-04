import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Clock,
  CreditCard,
  Bell,
  Save,
} from 'lucide-react';
import api from '../services/api';

type SettingsTab = 'geral' | 'horarios' | 'pagamentos' | 'notificacoes';

interface BusinessHours {
  [day: string]: {
    open: boolean;
    openTime: string;
    closeTime: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  primary_color: string | null;
  logo_url: string | null;
  banner_url: string | null;
  min_order_value: number | null;
  business_hours: BusinessHours | null;
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

const TABS: { value: SettingsTab; label: string; icon: typeof Store }[] = [
  { value: 'geral', label: 'Geral', icon: Store },
  { value: 'horarios', label: 'Horarios', icon: Clock },
  { value: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { value: 'notificacoes', label: 'Notificacoes', icon: Bell },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('geral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Geral form state
  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');

  // Horarios state
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);

  // Pagamentos state
  const [paymentCash, setPaymentCash] = useState(true);
  const [paymentCredit, setPaymentCredit] = useState(true);
  const [paymentDebit, setPaymentDebit] = useState(true);
  const [paymentPix, setPaymentPix] = useState(true);

  // Notificacoes state
  const [soundNotification, setSoundNotification] = useState(true);
  const [emailNotification, setEmailNotification] = useState(false);
  const [whatsappNotification, setWhatsappNotification] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const authData = JSON.parse(localStorage.getItem('menufacil-admin-auth') || '{}');
      const tenantSlug = authData?.state?.tenantSlug;

      if (!tenantSlug) {
        setErrorMessage('Slug do tenant nao encontrado. Faca login novamente.');
        setLoading(false);
        return;
      }

      const response = await api.get<Tenant>(`/tenants/slug/${tenantSlug}`);
      const tenant = response.data;

      setTenantId(tenant.id);
      setName(tenant.name || '');
      setPhone(tenant.phone || '');
      setAddress(tenant.address || '');
      setMinOrderValue(tenant.min_order_value != null ? String(tenant.min_order_value) : '');

      if (tenant.business_hours && Object.keys(tenant.business_hours).length > 0) {
        setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...tenant.business_hours });
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao carregar configuracoes do restaurante.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
  };

  const handleSaveGeral = async () => {
    try {
      setSaving(true);
      await api.put(`/tenants/${tenantId}`, {
        name,
        phone: phone || null,
        address: address || null,
        min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
      });
      showSuccess('Configuracoes gerais salvas com sucesso!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao salvar configuracoes.';
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHorarios = async () => {
    try {
      setSaving(true);
      await api.put(`/tenants/${tenantId}`, {
        business_hours: businessHours,
      });
      showSuccess('Horarios de funcionamento salvos com sucesso!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao salvar horarios.';
      showError(message);
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500 mt-1">Gerencie as configuracoes do seu restaurante</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Geral */}
          {activeTab === 'geral' && (
            <div className="space-y-6 max-w-2xl">
              {/* Nome do restaurante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do restaurante
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Nome do restaurante"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Endereco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereco</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
                />
              </div>

              {/* Valor minimo do pedido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valor minimo do pedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="0,00"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveGeral}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Salvar Configuracoes
                </button>
              </div>
            </div>
          )}

          {/* Tab: Horarios */}
          {activeTab === 'horarios' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500">
                Configure os horarios de funcionamento do seu restaurante para cada dia da semana.
              </p>

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
                        <button
                          type="button"
                          onClick={() => updateBusinessHour(day.key, 'open', !hours.open)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            hours.open ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              hours.open ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
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

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveHorarios}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Salvar Horarios
                </button>
              </div>
            </div>
          )}

          {/* Tab: Pagamentos */}
          {activeTab === 'pagamentos' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500">
                Configure as formas de pagamento aceitas pelo seu restaurante.
              </p>

              <div className="space-y-3">
                {[
                  {
                    label: 'Dinheiro',
                    description: 'Aceitar pagamento em dinheiro na entrega',
                    checked: paymentCash,
                    onChange: setPaymentCash,
                  },
                  {
                    label: 'Cartao de Credito',
                    description: 'Aceitar pagamento com cartao de credito',
                    checked: paymentCredit,
                    onChange: setPaymentCredit,
                  },
                  {
                    label: 'Cartao de Debito',
                    description: 'Aceitar pagamento com cartao de debito',
                    checked: paymentDebit,
                    onChange: setPaymentDebit,
                  },
                  {
                    label: 'PIX',
                    description: 'Aceitar pagamento via PIX',
                    checked: paymentPix,
                    onChange: setPaymentPix,
                  },
                ].map((method) => (
                  <div
                    key={method.label}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{method.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => method.onChange(!method.checked)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        method.checked ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          method.checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  As configuracoes de pagamento sao apenas informativas por enquanto. A integracao
                  com gateways de pagamento sera implementada em breve.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Notificacoes */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm text-gray-500">
                Configure como voce deseja ser notificado sobre novos pedidos e eventos.
              </p>

              <div className="space-y-3">
                {[
                  {
                    label: 'Notificacao sonora de novo pedido',
                    description: 'Tocar um som quando um novo pedido for recebido',
                    checked: soundNotification,
                    onChange: setSoundNotification,
                  },
                  {
                    label: 'Email para novos pedidos',
                    description: 'Receber um email quando um novo pedido for realizado',
                    checked: emailNotification,
                    onChange: setEmailNotification,
                  },
                  {
                    label: 'WhatsApp para novos pedidos',
                    description: 'Receber uma mensagem no WhatsApp para cada novo pedido',
                    checked: whatsappNotification,
                    onChange: setWhatsappNotification,
                  },
                ].map((notif) => (
                  <div
                    key={notif.label}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{notif.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => notif.onChange(!notif.checked)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        notif.checked ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          notif.checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Email input */}
              {emailNotification && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email de notificacao
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="notificacoes@seurestaurante.com"
                  />
                </div>
              )}

              {/* WhatsApp input */}
              {whatsappNotification && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    WhatsApp numero
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="5511999999999"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Informe o numero com codigo do pais (ex: 5511999999999)
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  As configuracoes de notificacao sao apenas informativas por enquanto. A integracao
                  com servicos de notificacao sera implementada em breve.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
