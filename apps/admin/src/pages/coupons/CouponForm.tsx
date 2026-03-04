import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Ticket, Percent, Calendar } from 'lucide-react';
import api from '../../services/api';

interface CouponFormData {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number | '';
  max_uses: number | '';
  valid_from: string;
  valid_until: string;
}

const emptyForm: CouponFormData = {
  code: '',
  discount_type: 'percent',
  discount_value: 0,
  min_order: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
};

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<CouponFormData>(emptyForm);
  const [error, setError] = useState('');

  // Fetch coupon for editing
  const { data: coupon } = useQuery({
    queryKey: ['coupon', id],
    queryFn: async () => {
      const response = await api.get(`/coupons/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code || '',
        discount_type: coupon.discount_type || 'percent',
        discount_value: Number(coupon.discount_value) || 0,
        min_order: coupon.min_order ? Number(coupon.min_order) : '',
        max_uses: coupon.max_uses ? Number(coupon.max_uses) : '',
        valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
        valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      });
    }
  }, [coupon]);

  const mutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const payload = {
        code: data.code,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        min_order: data.min_order !== '' ? Number(data.min_order) : undefined,
        max_uses: data.max_uses !== '' ? Number(data.max_uses) : undefined,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
      };

      if (isEditing) {
        return api.put(`/coupons/${id}`, payload);
      }
      return api.post('/coupons', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      navigate('/coupons');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao salvar cupom.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  const handleChange = (field: keyof CouponFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/coupons')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditing
              ? 'Atualize as informacoes do cupom'
              : 'Preencha os dados para criar um novo cupom'}
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
          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Codigo do Cupom <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="Ex: WELCOME10"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase font-mono"
              />
            </div>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de desconto <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.discount_type}
                onChange={(e) =>
                  handleChange('discount_type', e.target.value as 'percent' | 'fixed')
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor Fixo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Valor do desconto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {form.discount_type === 'fixed' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                    R$
                  </span>
                )}
                <input
                  type="number"
                  required
                  min={0}
                  step={form.discount_type === 'fixed' ? 0.01 : 1}
                  value={form.discount_value}
                  onChange={(e) =>
                    handleChange('discount_value', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className={`w-full py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    form.discount_type === 'fixed' ? 'pl-10 pr-4' : 'pl-4 pr-10'
                  }`}
                />
                {form.discount_type === 'percent' && (
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Min Order & Max Uses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Pedido minimo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                  R$
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.min_order}
                  onChange={(e) =>
                    handleChange(
                      'min_order',
                      e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="Sem minimo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximo de usos
              </label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) =>
                  handleChange(
                    'max_uses',
                    e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                  )
                }
                placeholder="Ilimitado"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de inicio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={form.valid_from}
                  onChange={(e) => handleChange('valid_from', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de expiracao <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={form.valid_until}
                  onChange={(e) => handleChange('valid_until', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => navigate('/coupons')}
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
            {mutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Cupom'}
          </button>
        </div>
      </form>
    </div>
  );
}
