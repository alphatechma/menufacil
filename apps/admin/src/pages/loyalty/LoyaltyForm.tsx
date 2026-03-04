import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Award, Star } from 'lucide-react';
import api from '../../services/api';

interface LoyaltyFormData {
  name: string;
  points_required: number;
  reward_type: 'discount_percent' | 'discount_fixed' | 'free_product';
  reward_value: number;
}

const emptyForm: LoyaltyFormData = {
  name: '',
  points_required: 1,
  reward_type: 'discount_percent',
  reward_value: 0,
};

export default function LoyaltyForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<LoyaltyFormData>(emptyForm);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: LoyaltyFormData) => {
      const payload = {
        name: data.name,
        points_required: Number(data.points_required),
        reward_type: data.reward_type,
        reward_value: Number(data.reward_value),
      };

      return api.post('/loyalty/rewards', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      navigate('/loyalty');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao salvar recompensa.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  const handleChange = (field: keyof LoyaltyFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getRewardValueLabel = () => {
    switch (form.reward_type) {
      case 'discount_percent':
        return 'Percentual de desconto (%)';
      case 'discount_fixed':
        return 'Valor do desconto (R$)';
      case 'free_product':
        return 'Quantidade de itens';
    }
  };

  const getRewardValuePlaceholder = () => {
    switch (form.reward_type) {
      case 'discount_percent':
        return 'Ex: 10';
      case 'discount_fixed':
        return 'Ex: 5.00';
      case 'free_product':
        return 'Ex: 1';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/loyalty')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Recompensa</h1>
          <p className="text-gray-500 mt-1">
            Preencha os dados para criar uma nova recompensa de fidelidade
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 space-y-5">
          {/* Reward Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome da Recompensa <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder='Ex: 10% de desconto'
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Points Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pontos necessarios <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                required
                min={1}
                value={form.points_required}
                onChange={(e) =>
                  handleChange('points_required', parseInt(e.target.value) || 1)
                }
                placeholder="Ex: 100"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Reward Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de recompensa <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.reward_type}
              onChange={(e) =>
                handleChange(
                  'reward_type',
                  e.target.value as LoyaltyFormData['reward_type'],
                )
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
            >
              <option value="discount_percent">Desconto Percentual</option>
              <option value="discount_fixed">Desconto em Valor</option>
              <option value="free_product">Produto Gratis</option>
            </select>
          </div>

          {/* Reward Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {getRewardValueLabel()} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {form.reward_type === 'discount_fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                  R$
                </span>
              )}
              <input
                type="number"
                required
                min={0}
                step={form.reward_type === 'discount_fixed' ? 0.01 : 1}
                value={form.reward_value}
                onChange={(e) =>
                  handleChange('reward_value', parseFloat(e.target.value) || 0)
                }
                placeholder={getRewardValuePlaceholder()}
                className={`w-full py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  form.reward_type === 'discount_fixed' ? 'pl-10 pr-4' : 'pl-4 pr-10'
                }`}
              />
              {form.reward_type === 'discount_percent' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                  %
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => navigate('/loyalty')}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Salvando...' : 'Criar Recompensa'}
          </button>
        </div>
      </form>
    </div>
  );
}
