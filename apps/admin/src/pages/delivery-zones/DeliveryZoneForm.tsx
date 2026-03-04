import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Plus, Trash2, MapPin } from 'lucide-react';
import api from '../../services/api';

interface DeliveryZoneFormData {
  name: string;
  fee: number;
  min_delivery_time: number;
  max_delivery_time: number;
  neighborhoods: string[];
}

const emptyForm: DeliveryZoneFormData = {
  name: '',
  fee: 0,
  min_delivery_time: 0,
  max_delivery_time: 0,
  neighborhoods: [],
};

export default function DeliveryZoneForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<DeliveryZoneFormData>(emptyForm);
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [error, setError] = useState('');

  const { data: zone } = useQuery({
    queryKey: ['delivery-zone', id],
    queryFn: async () => {
      const response = await api.get(`/delivery-zones/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (zone) {
      setForm({
        name: zone.name || '',
        fee: Number(zone.fee) || 0,
        min_delivery_time: zone.min_delivery_time || 0,
        max_delivery_time: zone.max_delivery_time || 0,
        neighborhoods: zone.neighborhoods || [],
      });
    }
  }, [zone]);

  const mutation = useMutation({
    mutationFn: async (data: DeliveryZoneFormData) => {
      const payload = {
        name: data.name,
        fee: Number(data.fee),
        min_delivery_time: Number(data.min_delivery_time),
        max_delivery_time: Number(data.max_delivery_time),
        neighborhoods: data.neighborhoods,
      };

      if (isEditing) {
        return api.put(`/delivery-zones/${id}`, payload);
      }
      return api.post('/delivery-zones', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      navigate('/delivery-zones');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao salvar zona de entrega.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.neighborhoods.length === 0) {
      setError('Adicione pelo menos um bairro.');
      return;
    }
    mutation.mutate(form);
  };

  const handleChange = (field: keyof DeliveryZoneFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addNeighborhood = () => {
    const trimmed = newNeighborhood.trim();
    if (!trimmed) return;
    if (form.neighborhoods.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return; // already exists
    }
    setForm((prev) => ({
      ...prev,
      neighborhoods: [...prev.neighborhoods, trimmed],
    }));
    setNewNeighborhood('');
  };

  const handleNeighborhoodKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNeighborhood();
    }
  };

  const removeNeighborhood = (index: number) => {
    setForm((prev) => ({
      ...prev,
      neighborhoods: prev.neighborhoods.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/delivery-zones')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
          </h1>
          <p className="text-gray-500 mt-1">
            Defina os bairros atendidos, taxa e tempo de entrega
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome da Zona <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Centro e Região, Zona Sul"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Taxa de Entrega (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              step={0.01}
              value={form.fee}
              onChange={(e) => handleChange('fee', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Min/Max Delivery Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tempo Minimo (minutos)
              </label>
              <input
                type="number"
                min={0}
                value={form.min_delivery_time}
                onChange={(e) =>
                  handleChange('min_delivery_time', parseInt(e.target.value) || 0)
                }
                placeholder="Ex: 30"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tempo Maximo (minutos)
              </label>
              <input
                type="number"
                min={0}
                value={form.max_delivery_time}
                onChange={(e) =>
                  handleChange('max_delivery_time', parseInt(e.target.value) || 0)
                }
                placeholder="Ex: 60"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Neighborhoods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bairros Atendidos <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Adicione os bairros que esta zona de entrega atende
            </p>

            {/* Add neighborhood input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newNeighborhood}
                onChange={(e) => setNewNeighborhood(e.target.value)}
                onKeyDown={handleNeighborhoodKeyDown}
                placeholder="Digite o nome do bairro e pressione Enter"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={addNeighborhood}
                disabled={!newNeighborhood.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Neighborhood tags */}
            {form.neighborhoods.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Nenhum bairro adicionado</p>
                <p className="text-xs text-gray-400 mt-1">
                  Digite o nome do bairro acima e clique em Adicionar
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.neighborhoods.map((neighborhood, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-primary-50 text-primary rounded-lg text-sm font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {neighborhood}
                    <button
                      type="button"
                      onClick={() => removeNeighborhood(index)}
                      className="p-0.5 rounded hover:bg-primary-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => navigate('/delivery-zones')}
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
            {mutation.isPending
              ? 'Salvando...'
              : isEditing
                ? 'Atualizar'
                : 'Criar Zona'}
          </button>
        </div>
      </form>
    </div>
  );
}
