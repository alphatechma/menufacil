import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Heart } from 'lucide-react';
import { useGetLoyaltyRewardsQuery, useDeleteLoyaltyRewardMutation } from '@/api/adminApi';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

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

export default function LoyaltyList() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: rewards = [], isLoading } = useGetLoyaltyRewardsQuery();
  const [deleteLoyaltyReward, { isLoading: isDeleting }] = useDeleteLoyaltyRewardMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLoyaltyReward(deleteTarget.id).unwrap();
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fidelidade</h1>
        <Link to="/admin/loyalty/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Recompensa
          </Button>
        </Link>
      </div>

      {rewards.length === 0 ? (
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pontos Necessarios
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo Recompensa
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rewards.map((reward: any) => (
                  <tr key={reward.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-pink-500" />
                        </div>
                        <span className="font-medium text-gray-900">{reward.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {reward.points_required}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={REWARD_TYPE_VARIANTS[reward.reward_type] ?? 'default'}>
                        {REWARD_TYPE_LABELS[reward.reward_type] ?? reward.reward_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {reward.reward_value}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDeleteTarget({ id: reward.id, name: reward.name })}
                          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
        </div>
      )}

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
