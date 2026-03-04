import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Gift,
  Star,
  Award,
  Percent,
} from 'lucide-react';
import api from '../../services/api';

interface LoyaltyReward {
  id: string;
  name: string;
  points_required: number;
  reward_type: 'discount_percent' | 'discount_fixed' | 'free_product';
  reward_value: number;
  tenant_id: string;
}

export default function LoyaltyList() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rewards = [], isLoading } = useQuery<LoyaltyReward[]>({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const response = await api.get('/loyalty/rewards');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/loyalty/rewards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      setDeleteId(null);
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getRewardTypeLabel = (type: LoyaltyReward['reward_type']) => {
    switch (type) {
      case 'discount_percent':
        return 'Desconto Percentual';
      case 'discount_fixed':
        return 'Desconto Fixo';
      case 'free_product':
        return 'Produto Gratis';
    }
  };

  const getRewardTypeIcon = (type: LoyaltyReward['reward_type']) => {
    switch (type) {
      case 'discount_percent':
        return <Percent className="w-4 h-4" />;
      case 'discount_fixed':
        return <span className="text-xs font-bold">R$</span>;
      case 'free_product':
        return <Gift className="w-4 h-4" />;
    }
  };

  const getRewardValueDisplay = (reward: LoyaltyReward) => {
    switch (reward.reward_type) {
      case 'discount_percent':
        return `${reward.reward_value}%`;
      case 'discount_fixed':
        return formatPrice(reward.reward_value);
      case 'free_product':
        return `${reward.reward_value} item(s)`;
    }
  };

  const getRewardTypeColor = (type: LoyaltyReward['reward_type']) => {
    switch (type) {
      case 'discount_percent':
        return 'bg-blue-100 text-blue-700';
      case 'discount_fixed':
        return 'bg-green-100 text-green-700';
      case 'free_product':
        return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programa de Fidelidade</h1>
          <p className="text-gray-500 mt-1">Gerencie as recompensas do programa de fidelidade</p>
        </div>
        <Link
          to="/loyalty/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Recompensa
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-500">
          <Gift className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma recompensa cadastrada</p>
          <p className="text-sm mt-1">Crie sua primeira recompensa para o programa de fidelidade</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <button
                  onClick={() => setDeleteId(reward.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-medium text-gray-900 mt-3">{reward.name}</h3>

              <div className="flex items-center gap-1.5 mt-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600">
                  {reward.points_required} pontos
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRewardTypeColor(reward.reward_type)}`}
                >
                  {getRewardTypeIcon(reward.reward_type)}
                  {getRewardTypeLabel(reward.reward_type)}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Valor: <span className="font-medium text-gray-900">{getRewardValueDisplay(reward)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900">Excluir Recompensa</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Tem certeza que deseja excluir esta recompensa? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
