import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
  useGetLoyaltyRewardsQuery,
} from '@/api/adminApi';
import { loyaltySchema, type LoyaltyFormData } from '@/schemas/admin/loyaltySchema';
import { useNotify } from '@/hooks/useNotify';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PriceInput } from '@/components/ui/PriceInput';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormPageSkeleton } from '@/components/ui/Skeleton';

export default function LoyaltyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const notify = useNotify();
  const isEditing = !!id;

  const { data: rewards = [], isLoading: loadingRewards } = useGetLoyaltyRewardsQuery();
  const existingReward = isEditing ? rewards.find((r: any) => r.id === id) : null;

  const [createLoyaltyReward, { isLoading: isCreating, error: createError }] = useCreateLoyaltyRewardMutation();
  const [updateLoyaltyReward, { isLoading: isUpdating, error: updateError }] = useUpdateLoyaltyRewardMutation();

  const error = createError || updateError;
  const isSaving = isCreating || isUpdating;

  const { control, handleSubmit, watch, setValue } = useForm<LoyaltyFormData>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: {
      name: existingReward?.name ?? '',
      description: existingReward?.description ?? '',
      points_required: existingReward?.points_required ?? 100,
      reward_type: existingReward?.reward_type ?? 'discount_percent',
      reward_value: existingReward?.reward_value ?? 10,
      is_active: existingReward?.is_active ?? true,
      max_redemptions_per_customer: existingReward?.max_redemptions_per_customer ?? 0,
      cooldown_hours: existingReward?.cooldown_hours ?? 24,
      expiration_hours: existingReward?.expiration_hours ?? 72,
    },
  });

  const isActive = watch('is_active');
  const rewardType = watch('reward_type');

  const onSubmit = async (data: LoyaltyFormData) => {
    try {
      if (isEditing) {
        await updateLoyaltyReward({ id, data }).unwrap();
      } else {
        await createLoyaltyReward(data).unwrap();
      }
      notify.success(isEditing ? 'Recompensa atualizada com sucesso!' : 'Recompensa criada com sucesso!');
      navigate('/admin/loyalty');
    } catch {
      notify.error('Erro ao salvar a recompensa. Tente novamente.');
    }
  };

  if (isEditing && loadingRewards) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader title={isEditing ? 'Editar Recompensa' : 'Nova Recompensa'} backTo="/admin/loyalty" />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar a recompensa. Tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <FormCard
            footer={
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/admin/loyalty')}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={isSaving}>
                  {isEditing ? 'Salvar Alteracoes' : 'Criar Recompensa'}
                </Button>
              </>
            }
          >
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
              <div>
                <span className="text-sm font-medium text-foreground">Ativa</span>
                <p className="text-xs text-muted-foreground mt-0.5">Recompensa visivel para os clientes</p>
              </div>
              <Toggle
                checked={isActive ?? true}
                onChange={(v) => setValue('is_active', v)}
              />
            </div>

            <FormField control={control} name="name" label="Nome" required>
              {(field) => (
                <Input {...field} placeholder="Ex: Desconto 10%, Pizza Gratis..." />
              )}
            </FormField>

            <FormField control={control} name="description" label="Descricao">
              {(field) => (
                <Input {...field} value={field.value ?? ''} placeholder="Descricao para o cliente" />
              )}
            </FormField>

            <FormField control={control} name="points_required" label="Pontos Necessarios" required>
              {(field) => (
                <Input {...field} type="number" min={1} placeholder="100" />
              )}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="reward_type" label="Tipo de Recompensa" required>
                {(field) => (
                  <Select {...field}>
                    <option value="discount_percent">Desconto %</option>
                    <option value="discount_fixed">Desconto Fixo (R$)</option>
                    <option value="free_product">Produto Gratis</option>
                  </Select>
                )}
              </FormField>

              <FormField
                control={control}
                name="reward_value"
                label={rewardType === 'discount_percent' ? 'Valor (%)' : 'Valor (R$)'}
                required
              >
                {(field) => (
                  rewardType === 'discount_percent' ? (
                    <Input {...field} type="number" min={1} max={100} placeholder="10" />
                  ) : (
                    <PriceInput {...field} placeholder="0.00" />
                  )
                )}
              </FormField>
            </div>
          </FormCard>

          <FormCard>
            <h3 className="text-sm font-semibold text-foreground">Regras de Resgate</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="cooldown_hours"
                label="Intervalo entre resgates (horas)"
              >
                {(field) => (
                  <div>
                    <Input {...field} type="number" min={0} placeholder="24" />
                    <p className="text-xs text-muted-foreground mt-1">0 = sem intervalo</p>
                  </div>
                )}
              </FormField>

              <FormField
                control={control}
                name="max_redemptions_per_customer"
                label="Limite de resgates por cliente"
              >
                {(field) => (
                  <div>
                    <Input {...field} type="number" min={0} placeholder="0" />
                    <p className="text-xs text-muted-foreground mt-1">0 = ilimitado</p>
                  </div>
                )}
              </FormField>

              <FormField
                control={control}
                name="expiration_hours"
                label="Validade do cupom (horas)"
              >
                {(field) => (
                  <div>
                    <Input {...field} type="number" min={1} placeholder="72" />
                    <p className="text-xs text-muted-foreground mt-1">Apos resgatar</p>
                  </div>
                )}
              </FormField>
            </div>
          </FormCard>
        </div>
      </form>
    </div>
  );
}
