import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import api from '../../services/api';

interface Variation {
  id?: string;
  name: string;
  price: number;
}

interface ExtraGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  extras: { id: string; name: string; price: number }[];
}

interface ProductFormData {
  name: string;
  description: string;
  base_price: number;
  category_id: string;
  image_url: string;
  is_pizza: boolean;
  is_active: boolean;
  sort_order: number;
  variations: Variation[];
  extra_group_ids: string[];
}

const emptyForm: ProductFormData = {
  name: '',
  description: '',
  base_price: 0,
  category_id: '',
  image_url: '',
  is_pizza: false,
  is_active: true,
  sort_order: 0,
  variations: [],
  extra_group_ids: [],
};

interface Category {
  id: string;
  name: string;
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'variations' | 'extras'>('general');

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories/all');
      return response.data;
    },
  });

  // Fetch extra groups
  const { data: extraGroups = [] } = useQuery<ExtraGroup[]>({
    queryKey: ['extra-groups'],
    queryFn: async () => {
      const response = await api.get('/extra-groups');
      return response.data;
    },
  });

  // Fetch product for editing
  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get(`/products/${id}`);
      return response.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        base_price: Number(product.base_price) || 0,
        category_id: product.category_id || '',
        image_url: product.image_url || '',
        is_pizza: product.is_pizza || false,
        is_active: product.is_active ?? true,
        sort_order: product.sort_order || 0,
        variations: product.variations?.map((v: Variation) => ({
          id: v.id,
          name: v.name,
          price: Number(v.price),
        })) || [],
        extra_group_ids: product.extra_groups?.map((eg: ExtraGroup) => eg.id) || [],
      });
    }
  }, [product]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        ...data,
        base_price: Number(data.base_price),
        variations: data.variations.map((v) => ({
          name: v.name,
          price: Number(v.price),
        })),
      };

      if (isEditing) {
        return api.put(`/products/${id}`, payload);
      }
      return api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao salvar produto.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  const handleChange = (field: keyof ProductFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Variation handlers
  const addVariation = () => {
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, { name: '', price: 0 }],
    }));
  };

  const updateVariation = (index: number, field: keyof Variation, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const removeVariation = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  // Extra group toggle
  const toggleExtraGroup = (groupId: string) => {
    setForm((prev) => ({
      ...prev,
      extra_group_ids: prev.extra_group_ids.includes(groupId)
        ? prev.extra_group_ids.filter((id) => id !== groupId)
        : [...prev.extra_group_ids, groupId],
    }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const tabs = [
    { key: 'general' as const, label: 'Informacoes Gerais' },
    { key: 'variations' as const, label: `Variacoes (${form.variations.length})` },
    { key: 'extras' as const, label: `Grupos de Extras (${form.extra_group_ids.length})` },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditing
              ? 'Atualize as informacoes do produto'
              : 'Preencha os dados para criar um novo produto'}
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Margherita"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descricao
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descreva o produto..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Preco Base (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={form.base_price}
                    onChange={(e) => handleChange('base_price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  URL da Imagem
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {form.image_url && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-24 h-24 rounded-xl object-cover border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleChange('image_url', '')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Order, Pizza, Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ordem
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo Pizza
                  </label>
                  <div className="flex items-center gap-3 h-[50px]">
                    <button
                      type="button"
                      onClick={() => handleChange('is_pizza', !form.is_pizza)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        form.is_pizza ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          form.is_pizza ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-600">
                      {form.is_pizza ? 'Sim' : 'Nao'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <div className="flex items-center gap-3 h-[50px]">
                    <button
                      type="button"
                      onClick={() => handleChange('is_active', !form.is_active)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        form.is_active ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          form.is_active ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-600">
                      {form.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Variations Tab */}
          {activeTab === 'variations' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Variacoes do Produto</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Adicione tamanhos ou sabores com precos diferentes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariation}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              {form.variations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-sm">Nenhuma variacao adicionada</p>
                  <p className="text-xs mt-1">
                    Use variacoes para diferentes tamanhos ou opcoes
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.variations.map((variation, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Nome (ex: Grande)"
                          value={variation.name}
                          onChange={(e) => updateVariation(index, 'name', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="Preco"
                          min={0}
                          step={0.01}
                          value={variation.price}
                          onChange={(e) =>
                            updateVariation(index, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariation(index)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extras Tab */}
          {activeTab === 'extras' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Grupos de Extras</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecione quais grupos de extras se aplicam a este produto
                </p>
              </div>

              {extraGroups.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-sm">Nenhum grupo de extras cadastrado</p>
                  <p className="text-xs mt-1">
                    Crie grupos de extras no menu lateral para poder associa-los aos produtos
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extraGroups.map((group) => {
                    const isSelected = form.extra_group_ids.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => toggleExtraGroup(group.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{group.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {group.is_required ? 'Obrigatorio' : 'Opcional'} | Min:{' '}
                              {group.min_select} | Max: {group.max_select}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Show extras in group */}
                        {group.extras && group.extras.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {group.extras.map((extra) => (
                              <span
                                key={extra.id}
                                className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-600"
                              >
                                {extra.name} - {formatPrice(extra.price)}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={() => navigate('/products')}
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
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
