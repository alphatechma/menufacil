import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCreatePublicReservationMutation } from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { maskPhone } from '@/utils/masks';

export default function ReservationRequest() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const tenant = useAppSelector((state) => state.tenant.tenant);

  const [createReservation, { isLoading }] = useCreatePublicReservationMutation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim() || !date || !timeStart) {
      setError('Preencha todos os campos obrigatorios.');
      return;
    }

    try {
      await createReservation({
        slug: slug!,
        data: {
          customer_name: name.trim(),
          customer_phone: phone.replace(/\D/g, ''),
          party_size: parseInt(partySize, 10),
          date,
          time_start: timeStart,
          notes: notes.trim() || undefined,
        },
      }).unwrap();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.data?.message || 'Erro ao enviar reserva. Tente novamente.');
    }
  };

  if (success) {
    return (
      <div className="px-4 pt-8 pb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--tenant-primary-light)' }}
          >
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reserva enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sua reserva foi enviada com sucesso. Aguarde a confirmacao do restaurante.
          </p>
          <button
            onClick={() => navigate(`/${slug}`)}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm active:scale-95 transition-all"
            style={{ background: 'var(--tenant-gradient)' }}
          >
            Voltar ao inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Reservar Mesa</h2>
      </div>

      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-center mb-6">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'var(--tenant-primary-light)' }}
            >
              <CalendarCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Solicitar Reserva
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {tenant?.name || 'Restaurante'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Telefone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-1234"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horario <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quantidade de pessoas <span className="text-red-500">*</span>
              </label>
              <select
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'pessoa' : 'pessoas'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Observacoes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma observacao especial? (aniversario, alergia, etc.)"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 outline-none transition-all text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              style={{ background: 'var(--tenant-gradient)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Solicitar Reserva'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
