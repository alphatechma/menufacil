import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Heart, Pencil, History, Clock, User, Gift } from 'lucide-react';
import {
  useGetLoyaltyRewardsQuery,
  useDeleteLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
  useGetLoyaltyRedemptionsQuery,
} from '@/api/adminApi';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Tabs } from '@/components/ui/Tabs';

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount_percent: 'Desconto %',
  discount_fixed: 'Desconto Fixo',
  free_product: 'Produto Gratis',
};

const REWARD_TYPE_VARIANTS: Record<string, 'info' | 'success' | 'warning'> = {
  discount_percent: 'info',
  discount_fixed: 'success',
  free_product: 'warning',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  used: { label: 'Usado', variant: 'success' },
  expired: { label: 'Expirado', variant: 'danger' },
};

const TABS = [
  { key: 'rewards', label: 'Recompensas' },
  { key: 'history', label: 'Historico de Resgates' },
];

export default function LoyaltyList() {
  const [activeTab, setActiveTab] = useState('rewards');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: rewards = [], isLoading } = useGetLoyaltyRewardsQuery();
  const { data: redemptions = [], isLoading: loadingRedemptions } = useGetLoyaltyRedemptionsQuery();
  const [deleteLoyaltyReward, { isLoading: isDeleting }] = useDeleteLoyaltyRewardMutation();
  const [updateLoyaltyReward] = useUpdateLoyaltyRewardMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLoyaltyReward(deleteTarget.id).unwrap();
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (reward: any) => {
    await updateLoyaltyReward({
      id: reward.id,
      data: { is_active: !reward.is_active },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRewardValue = (reward: any) => {
    if (reward.reward_type === 'discount_percent') return `${reward.reward_value}%`;
    if (reward.reward_type === 'discount_fixed') return `R$ ${Number(reward.reward_value).toFixed(2)}`;
    return 'Produto';
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fidelidade</h1>
        <Link to="/admin/loyalty/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Recompensa
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recompensas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{rewards.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{rewards.filter((r: any) => r.is_active).length} ativas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Resgates</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{redemptions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {redemptions.filter((r: any) => r.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pontos Resgatados</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {redemptions.reduce((sum: number, r: any) => sum + (r.points_spent || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="px-4 pt-2"
        />

        {activeTab === 'rewards' && (
          <>
            {rewards.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Heart className="w-12 h-12" />}
                  title="Nenhuma recompensa cadastrada"
                  description="Crie sua primeira recompensa para o programa de fidelidade."
                  action={
                    <Link to="/admin/loyalty/new">
                      <Button>
                        <Plus className="w-4 h-4" />
                        Nova Recompensa
                      </Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ativa</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pontos</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Regras</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {rewards.map((reward: any) => (
                      <tr key={reward.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${!reward.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                          <Toggle
                            checked={reward.is_active}
                            onChange={() => handleToggleActive(reward)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center">
                              <Heart className="w-5 h-5 text-pink-500" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{reward.name}</span>
                              {reward.description && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{reward.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {reward.points_required}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={REWARD_TYPE_VARIANTS[reward.reward_type] ?? 'default'}>
                            {REWARD_TYPE_LABELS[reward.reward_type] ?? reward.reward_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                          {formatRewardValue(reward)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Intervalo: {reward.cooldown_hours || 0}h
                            </div>
                            <div>
                              Limite: {reward.max_redemptions_per_customer > 0 ? `${reward.max_redemptions_per_customer}x` : 'Ilimitado'}
                            </div>
                            <div>Validade: {reward.expiration_hours || 72}h</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/admin/loyalty/${reward.id}/edit`}
                              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget({ id: reward.id, name: reward.name })}
                              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {loadingRedemptions ? (
              <div className="flex items-center justify-center py-12">
                <PageSpinner />
              </div>
            ) : redemptions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<History className="w-12 h-12" />}
                  title="Nenhum resgate realizado"
                  description="Quando os clientes resgatarem recompensas, o historico aparecera aqui."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recompensa</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pontos</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cupom</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expira</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {redemptions.map((r: any) => {
                      const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {r.customer?.name || 'Cliente'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Gift className="w-4 h-4 text-pink-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">
                                {r.reward?.name || 'Recompensa removida'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                            {r.points_spent}
                          </td>
                          <td className="px-6 py-4">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-gray-900 dark:text-gray-100">
                              {r.coupon_code}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(r.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {r.expires_at ? formatDate(r.expires_at) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Recompensa"
        message={`Tem certeza que deseja excluir a recompensa "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
