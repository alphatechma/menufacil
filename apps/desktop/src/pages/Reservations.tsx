import { useState } from 'react';
import { CalendarCheck, Check, X as XIcon, Plus } from 'lucide-react';
import {
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationStatusMutation,
} from '@/api/api';
import { useNotify } from '@/hooks/useNotify';
import { TimeSelect, DateSelect } from '@/components/ui/DateTimeSelect';
import { cn } from '@/utils/cn';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-50 text-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-700' },
  completed: { label: 'Concluida', color: 'bg-blue-50 text-blue-700' },
  no_show: { label: 'No-show', color: 'bg-gray-100 text-gray-600' },
};

interface ReservationForm {
  customer_name: string;
  customer_phone: string;
  party_size: string;
  date: string;
  time_start: string;
  time_end: string;
  notes: string;
}

const emptyForm: ReservationForm = {
  customer_name: '',
  customer_phone: '',
  party_size: '2',
  date: '',
  time_start: '',
  time_end: '',
  notes: '',
};

const inputClass =
  'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

// TimeSelect e DateSelect vêm de @/components/ui/DateTimeSelect.

/** Campo com label, marca de obrigatório e mensagem de erro (espelha o FormField do web). */
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function Reservations() {
  const notify = useNotify();
  const { data: reservations = [], isLoading } = useGetReservationsQuery();
  const [createReservation, { isLoading: creating }] = useCreateReservationMutation();
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateReservationStatusMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModalOpen(true); };

  const set = (field: keyof ReservationForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: '' } : e));
  };

  const handleApprove = async (id: string) => {
    await updateStatus({ id, status: 'confirmed' });
  };

  const handleReject = async (id: string) => {
    await updateStatus({ id, status: 'cancelled' });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.customer_name.trim().length < 2) e.customer_name = 'Nome deve ter pelo menos 2 caracteres';
    if (form.customer_phone.trim().length < 8) e.customer_phone = 'Telefone inválido';
    const size = parseInt(form.party_size, 10);
    if (!size || size < 1) e.party_size = 'Mínimo 1 pessoa';
    else if (size > 100) e.party_size = 'Máximo 100 pessoas';
    if (!form.date) e.date = 'Data obrigatória';
    if (!form.time_start) e.time_start = 'Horário obrigatório';
    if (form.time_end && form.time_start && form.time_end <= form.time_start)
      e.time_end = 'Término deve ser após o início';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload: any = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      date: form.date,
      time_start: form.time_start,
      party_size: parseInt(form.party_size, 10) || 1,
    };
    if (form.time_end) payload.time_end = form.time_end;
    if (form.notes.trim()) payload.notes = form.notes.trim();
    try {
      await createReservation(payload).unwrap();
      notify.success('Reserva criada com sucesso!');
      setModalOpen(false);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao criar reserva.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Reservas</h1>
          <span className="text-sm text-gray-500">{reservations.length} reserva(s)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors active:scale-95">
          <Plus className="w-4 h-4" /> Nova Reserva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma reserva encontrada</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">As reservas dos clientes aparecerao aqui</p>
            <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors active:scale-95">
              <Plus className="w-4 h-4" /> Nova Reserva
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data/Hora</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pessoas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesa</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map((r: any) => {
                const st = statusMap[r.status] || statusMap.pending;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{r.customer_name || r.customer?.name || '-'}</p>
                      <p className="text-xs text-gray-500">{r.customer_phone || r.customer?.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '-'}
                      {(r.time_start || r.time) && <span className="ml-1 font-medium">{r.time_start || r.time}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{r.party_size || r.guests || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{r.table?.number || r.table_number || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-full', st.color)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={updatingStatus}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Confirmar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={updatingStatus}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancelar"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nova Reserva</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><XIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <Field label="Nome do cliente" required error={errors.customer_name}>
                  <input type="text" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} className={inputClass} placeholder="Ex: Joao Silva" autoFocus />
                </Field>
                <Field label="Telefone" required error={errors.customer_phone}>
                  <input type="tel" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} className={inputClass} placeholder="(11) 99999-9999" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Número de pessoas" required error={errors.party_size}>
                    <input type="number" value={form.party_size} onChange={(e) => set('party_size', e.target.value)} className={inputClass} min={1} max={100} placeholder="2" />
                  </Field>
                  <Field label="Data" required error={errors.date}>
                    <DateSelect value={form.date} onChange={(v) => set('date', v)} required />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Horário início" required error={errors.time_start}>
                    <TimeSelect value={form.time_start} onChange={(v) => set('time_start', v)} />
                  </Field>
                  <Field label="Horário término" error={errors.time_end}>
                    <TimeSelect value={form.time_end} onChange={(v) => set('time_end', v)} clearable />
                  </Field>
                </div>
                <Field label="Observações">
                  <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} rows={3} placeholder="Aniversario, preferencia de mesa, alergias..." />
                </Field>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  {creating ? 'Salvando...' : 'Criar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
