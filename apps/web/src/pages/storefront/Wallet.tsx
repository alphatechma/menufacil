import { useParams, useNavigate } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { useGetWalletBalanceQuery, useGetWalletTransactionsQuery } from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui/Spinner';

export default function WalletPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.customerAuth?.isAuthenticated);

  const { data: balanceData, isLoading: balanceLoading } = useGetWalletBalanceQuery(
    { slug: slug! },
    { skip: !slug || !isAuthenticated },
  );

  const { data: transactions = [], isLoading: txLoading } = useGetWalletTransactionsQuery(
    { slug: slug! },
    { skip: !slug || !isAuthenticated },
  );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <WalletIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Carteira Digital</h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          Faca login para acessar sua carteira digital.
        </p>
        <button
          onClick={() => navigate(`/${slug}/account`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--tenant-primary)' }}
        >
          Fazer Login
        </button>
      </div>
    );
  }

  if (balanceLoading) return <Spinner />;

  const balance = balanceData?.balance ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Carteira Digital</h1>
      </div>

      {/* Balance Card */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{
          background: `linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <WalletIcon className="w-5 h-5 opacity-80" />
          <span className="text-sm font-medium opacity-80">Saldo disponivel</span>
        </div>
        <p className="text-3xl font-bold">{formatPrice(balance)}</p>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Historico</h2>

        {txLoading ? (
          <Spinner />
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhuma transacao ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center',
                      tx.type === 'credit'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600',
                    )}
                  >
                    {tx.type === 'credit' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {tx.type === 'credit' ? '+' : '-'}
                  {formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
