import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLoyaltyRewardMutation } from '@/api/adminApi';
import { loyaltySchema, type LoyaltyFormData } from '@/schemas/admin/loyaltySchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

export default function LoyaltyForm() {
  const navigate = useNavigate();

  const [createLoyaltyReward, { isLoading: isCreating, error }] = useCreateLoyaltyRewardMutation();

  const { control, handleSubmit } = useForm<LoyaltyFormData>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: {
      name: '',
      points_required: 0,
      reward_type: 'discount_percent',
      reward_value: 0,
    },
  });

  const onSubmit = async (data: LoyaltyFormData) => {
    try {
      await createLoyaltyReward(data).unwrap();
      navigate('/admin/loyalty');
    } catch {
      // Error is captured by RTK Query and displayed via ErrorAlert
    }
  };

  return (
    <div>
      <PageHeader title="Nova Recompensa" backTo="/admin/loyalty" />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar a recompensa. Tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
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
              <Button type="submit" loading={isCreating}>
                Criar Recompensa
              </Button>
            </>
          }
        >
          <FormField control={control} name="name" label="Nome" required>
            {(field) => (
              <Input
                {...field}
                placeholder="Ex: Desconto 10%, Pizza Gratis..."
              />
            )}
          </FormField>

          <FormField control={control} name="points_required" label="Pontos Necessarios" required>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="100"
              />
            )}
          </FormField>

          <FormField control={control} name="reward_type" label="Tipo de Recompensa" required>
            {(field) => (
              <Select {...field}>
                <option value="discount_percent">Desconto %</option>
                <option value="discount_fixed">Desconto Fixo</option>
                <option value="free_product">Produto Gratis</option>
              </Select>
            )}
          </FormField>

          <FormField control={control} name="reward_value" label="Valor" required>
            {(field) => (
              <PriceInput
                {...field}
                placeholder="0.00"
              />
            )}
          </FormField>
        </FormCard>
      </form>
    </div>
  );
}
