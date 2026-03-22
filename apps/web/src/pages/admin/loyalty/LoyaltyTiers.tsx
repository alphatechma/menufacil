import { useState } from 'react';
import { Crown, Medal, Award, Plus, Pencil, Trash2, Sparkles, Star } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetLoyaltyTiersQuery,
  useCreateLoyaltyTierMutation,
  useUpdateLoyaltyTierMutation,
  useDeleteLoyaltyTierMutation,
  useSeedLoyaltyTiersMutation,
} from '@/api/adminApi';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';

const ICON_MAP: Record<string, typeof Crown> = {
  crown: Crown,
  medal: Medal,
  award: Award,
  star: Star,
  sparkles: Sparkles,
};

const ICON_OPTIONS = [
  { value: 'medal', label: 'Medalha' },
  { value: 'award', label: 'Troféu' },
  { value: 'crown', label: 'Coroa' },
  { value: 'star', label: 'Estrela' },
  { value: 'sparkles', label: 'Brilho' },
];

const COLOR_OPTIONS = [
  { value: '#CD7F32', label: 'Bronze' },
  { value: '#C0C0C0', label: 'Prata' },
  { value: '#FFD700', label: 'Ouro' },
  { value: '#B9F2FF', label: 'Diamante' },
  { value: '#E5E4E2', label: 'Platina' },
  { value: '#FF6B35', label: 'Laranja' },
  { value: '#4F46E5', label: 'Indigo' },
];

interface TierForm {
  name: string;
  min_points: number;
  multiplier: number;
  benefits: string[];
  icon: string;
  color: string;
  sort_order: number;
}

const defaultForm: TierForm = {
  name: '',
  min_points: 0,
  multiplier: 1.0,
  benefits: [],
  icon: 'medal',
  color: '#CD7F32',
  sort_order: 0,
};

export default function LoyaltyTiers() {
  const notify = useNotify();
  const { data: tiers = [], isLoading } = useGetLoyaltyTiersQuery();
  const [createTier, { isLoading: creating }] = useCreateLoyaltyTierMutation();
  const [updateTier, { isLoading: updating }] = useUpdateLoyaltyTierMutation();
  const [deleteTier] = useDeleteLoyaltyTierMutation();
  const [seedTiers, { isLoading: seeding }] = useSeedLoyaltyTiersMutation();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TierForm>(defaultForm);
  const [benefitInput, setBenefitInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setBenefitInput('');
    setShowModal(true);
  };

  const openEdit = (tier: any) => {
    setEditId(tier.id);
    setForm({
      name: tier.name,
      min_points: tier.min_points,
      multiplier: Number(tier.multiplier),
      benefits: tier.benefits || [],
      icon: tier.icon || 'medal',
      color: tier.color || '#CD7F32',
      sort_order: tier.sort_order || 0,
    });
    setBenefitInput('');
    setShowModal(true);
  };

  const addBenefit = () => {
    const trimmed = benefitInput.trim();
    if (trimmed && !form.benefits.includes(trimmed)) {
      setForm((prev) => ({ ...prev, benefits: [...prev.benefits, trimmed] }));
      setBenefitInput('');
    }
  };

  const removeBenefit = (idx: number) => {
    setForm((prev) => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      notify.error('Nome é obrigatório');
      return;
    }
    try {
      if (editId) {
        await updateTier({ id: editId, data: form }).unwrap();
        notify.success('Tier atualizado!');
      } else {
        await createTier(form).unwrap();
        notify.success('Tier criado!');
      }
      setShowModal(false);
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao salvar tier');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTier(deleteId).unwrap();
      notify.success('Tier excluido!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao excluir tier');
    } finally {
      setDeleteId(null);
    }
  };

  const handleSeed = async () => {
    try {
      await seedTiers().unwrap();
      notify.success('Tiers padrao criados!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao criar tiers padrao');
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || Medal;
    return IconComponent;
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tiers de Fidelidade</h2>
          <p className="text-sm text-gray-500">Niveis de fidelidade com multiplicadores de pontos</p>
        </div>
        <div className="flex gap-2">
          {tiers.length === 0 && (
            <Button variant="outline" onClick={handleSeed} loading={seeding}>
              <Sparkles className="w-4 h-4 mr-1" />
              Gerar Tiers Padrao
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo Tier
          </Button>
        </div>
      </div>

      {tiers.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="Nenhum tier cadastrado"
          description="Crie tiers de fidelidade para motivar seus clientes"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier: any) => {
            const IconComp = getIcon(tier.icon);
            return (
              <div
                key={tier.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tier.color}20` }}
                    >
                      <IconComp className="w-6 h-6" style={{ color: tier.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{tier.name}</h3>
                      <p className="text-sm text-gray-500">{tier.min_points} pontos min.</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(tier)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(tier.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    {Number(tier.multiplier)}x pontos
                  </span>
                </div>

                {tier.benefits && tier.benefits.length > 0 && (
                  <ul className="space-y-1">
                    {tier.benefits.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Tier' : 'Novo Tier'}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Bronze"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pontos Mínimos</label>
              <input
                type="number"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                value={form.min_points}
                onChange={(e) => setForm((prev) => ({ ...prev, min_points: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Multiplicador</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                value={form.multiplier}
                onChange={(e) => setForm((prev) => ({ ...prev, multiplier: Number(e.target.value) }))}
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icone</label>
            <div className="flex gap-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = ICON_MAP[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, icon: opt.value }))}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-colors',
                      form.icon === opt.value ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300',
                    )}
                    title={opt.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color: opt.value }))}
                  className={cn(
                    'w-10 h-10 rounded-xl border-2 transition-all',
                    form.color === opt.value ? 'border-gray-900 scale-110' : 'border-gray-200',
                  )}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              value={form.sort_order}
              onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficios</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                placeholder="Adicionar beneficio"
              />
              <Button variant="outline" size="sm" onClick={addBenefit}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.benefits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.benefits.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                  >
                    {b}
                    <button onClick={() => removeBenefit(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating || updating}>
              {editId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Tier"
        message="Tem certeza que deseja excluir este tier de fidelidade?"
      />
    </div>
  );
}
