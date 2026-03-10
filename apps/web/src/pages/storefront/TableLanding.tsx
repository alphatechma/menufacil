import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UtensilsCrossed, Loader2, AlertCircle } from 'lucide-react';
import { useGetPublicTableQuery, useJoinTableMutation } from '@/api/customerApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTableContext } from '@/store/slices/cartSlice';

export default function TableLanding() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const tenant = useAppSelector((state) => state.tenant.tenant);

  const { data: table, isLoading, error } = useGetPublicTableQuery(
    { slug: slug!, tableNumber: Number(tableNumber) },
    { skip: !slug || !tableNumber },
  );
  const [joinTable, { isLoading: joining }] = useJoinTableMutation();
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleViewMenu = async () => {
    setJoinError(null);
    try {
      const result = await joinTable({ slug: slug!, tableNumber: Number(tableNumber) }).unwrap();
      dispatch(setTableContext({
        tableId: result.table.id,
        tableSessionId: result.session.id,
      }));
      navigate(`/${slug}/menu`);
    } catch (err: any) {
      setJoinError(err?.data?.message || 'Erro ao acessar mesa');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="px-4 pt-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Mesa nao encontrada</h2>
          <p className="text-sm text-gray-500 mb-6">
            Esta mesa nao existe ou nao esta disponivel no momento.
          </p>
          <button
            onClick={() => navigate(`/${slug}`)}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'var(--tenant-gradient)' }}
          >
            Ir para o inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: 'var(--tenant-primary-light)' }}
        >
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Mesa {table.number}
        </h1>
        {table.label && (
          <p className="text-sm text-gray-500 mb-1">{table.label}</p>
        )}
        {tenant?.name && (
          <p className="text-sm text-gray-400 mb-6">{tenant.name}</p>
        )}

        <p className="text-sm text-gray-600 mb-8">
          Bem-vindo! Faca seu pedido direto pelo celular.
        </p>

        {joinError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{joinError}</p>
          </div>
        )}

        <button
          onClick={handleViewMenu}
          disabled={joining}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          style={{ background: 'var(--tenant-gradient)' }}
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Abrindo mesa...
            </>
          ) : (
            'Ver Cardapio'
          )}
        </button>
      </div>
    </div>
  );
}
