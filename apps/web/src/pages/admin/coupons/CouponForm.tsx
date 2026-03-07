import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetCouponQuery, useCreateCouponMutation, useUpdateCouponMutation } from '@/api/adminApi';
import { couponSchema, type CouponFormData } from '@/schemas/admin/couponSchema';
import { toast } from 'sonner';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageSpinner } from '@/components/ui/Spinner';

export default function CouponForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: coupon, isLoading: isLoadingCoupon } = useGetCouponQuery(id!, { skip: !isEditing });
  const [createCoupon, { isLoading: isCreating, error: createError }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating, error: updateError }] = useUpdateCouponMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const { control, handleSubmit, reset } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      discount_type: 'percent',
      discount_value: 0,
      min_order: null,
      max_uses: null,
      valid_from: '',
      valid_until: '',
    },
  });

  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code ?? '',
        discount_type: coupon.discount_type ?? 'percent',
        discount_value: coupon.discount_value ?? 0,
        min_order: coupon.min_order ?? null,
        max_uses: coupon.max_uses ?? null,
        valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : '',
        valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : '',
      });
    }
  }, [coupon, reset]);

  const onSubmit = async (data: CouponFormData) => {
    try {
      if (isEditing) {
        await updateCoupon({ id: id!, data }).unwrap();
      } else {
        await createCoupon(data).unwrap();
      }
      toast.success(isEditing ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!');
      navigate('/admin/coupons');
    } catch {
      toast.error('Erro ao salvar o cupom. Tente novamente.');
    }
  };

  if (isEditing && isLoadingCoupon) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Cupom' : 'Novo Cupom'}
        backTo="/admin/coupons"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar o cupom. Tente novamente."
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
                onClick={() => navigate('/admin/coupons')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isEditing ? 'Salvar Alteracoes' : 'Criar Cupom'}
              </Button>
            </>
          }
        >
          <FormField control={control} name="code" label="Codigo" required>
            {(field) => (
              <Input
                {...field}
                placeholder="Ex: DESCONTO10, FRETEGRATIS..."
              />
            )}
          </FormField>

          <FormField control={control} name="discount_type" label="Tipo de desconto" required>
            {(field) => (
              <Select {...field}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </Select>
            )}
          </FormField>

          <FormField control={control} name="discount_value" label="Valor do desconto" required>
            {(field) => (
              <PriceInput
                {...field}
                placeholder="0.00"
              />
            )}
          </FormField>

          <FormField control={control} name="min_order" label="Pedido minimo (opcional)">
            {(field) => (
              <PriceInput
                {...field}
                value={field.value ?? ''}
                placeholder="0.00"
              />
            )}
          </FormField>

          <FormField control={control} name="max_uses" label="Maximo de usos (opcional)">
            {(field) => (
              <Input
                {...field}
                value={field.value ?? ''}
                type="number"
                min={1}
                placeholder="Ilimitado"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField control={control} name="valid_from" label="Valido a partir de" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            </FormField>

            <FormField control={control} name="valid_until" label="Valido ate" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            </FormField>
          </div>
        </FormCard>
      </form>
    </div>
  );
}
