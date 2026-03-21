import { CalendarCheck, Check, X as XIcon } from 'lucide-react';
import {
  useGetReservationsQuery,
  useUpdateReservationStatusMutation,
} from '@/api/api';
import { cn } from '@/utils/cn';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-50 text-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-700' },
  completed: { label: 'Concluida', color: 'bg-blue-50 text-blue-700' },
  no_show: { label: 'No-show', color: 'bg-gray-100 text-gray-600' },
};

export default function Reservations() {
  const { data: reservations = [], isLoading } = useGetReservationsQuery();
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateReservationStatusMutation();

  const handleApprove = async (id: string) => {
    await updateStatus({ id, status: 'confirmed' });
  };

  const handleReject = async (id: string) => {
    await updateStatus({ id, status: 'cancelled' });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-3 mb-4">
        <CalendarCheck className="w-6 h-6 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Reservas</h1>
        <span className="text-sm text-gray-500">{reservations.length} reserva(s)</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CalendarCheck className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhuma reserva encontrada</p>
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acoes</th>
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
                      {r.time && <span className="ml-1 font-medium">{r.time}</span>}
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
    </div>
  );
}
