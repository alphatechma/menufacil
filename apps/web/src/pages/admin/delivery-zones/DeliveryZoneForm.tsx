import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useGetDeliveryZoneQuery, useCreateDeliveryZoneMutation, useUpdateDeliveryZoneMutation } from '@/api/adminApi';
import { deliveryZoneSchema, type DeliveryZoneFormData } from '@/schemas/admin/deliveryZoneSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageSpinner } from '@/components/ui/Spinner';

export default function DeliveryZoneForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: zone, isLoading: isLoadingZone } = useGetDeliveryZoneQuery(id!, { skip: !isEditing });
  const [createZone, { isLoading: isCreating, error: createError }] = useCreateDeliveryZoneMutation();
  const [updateZone, { isLoading: isUpdating, error: updateError }] = useUpdateDeliveryZoneMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const [neighborhoodInput, setNeighborhoodInput] = useState('');

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<DeliveryZoneFormData>({
    resolver: zodResolver(deliveryZoneSchema),
    defaultValues: {
      name: '',
      fee: 0,
      min_delivery_time: 0,
      max_delivery_time: 0,
      neighborhoods: [],
    },
  });

  const neighborhoods = watch('neighborhoods');

  useEffect(() => {
    if (zone) {
      reset({
        name: zone.name ?? '',
        fee: zone.fee ?? 0,
        min_delivery_time: zone.min_delivery_time ?? 0,
        max_delivery_time: zone.max_delivery_time ?? 0,
        neighborhoods: zone.neighborhoods ?? [],
      });
    }
  }, [zone, reset]);

  const addNeighborhood = () => {
    const trimmed = neighborhoodInput.trim();
    if (!trimmed) return;
    if (neighborhoods.includes(trimmed)) {
      setNeighborhoodInput('');
      return;
    }
    setValue('neighborhoods', [...neighborhoods, trimmed], { shouldValidate: true });
    setNeighborhoodInput('');
  };

  const removeNeighborhood = (index: number) => {
    setValue(
      'neighborhoods',
      neighborhoods.filter((_: string, i: number) => i !== index),
      { shouldValidate: true },
    );
  };

  const handleNeighborhoodKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNeighborhood();
    }
  };

  const onSubmit = async (data: DeliveryZoneFormData) => {
    try {
      if (isEditing) {
        await updateZone({ id: id!, data }).unwrap();
      } else {
        await createZone(data).unwrap();
      }
      navigate('/admin/delivery-zones');
    } catch {
      // Error is captured by RTK Query and displayed via ErrorAlert
    }
  };

  if (isEditing && isLoadingZone) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
        backTo="/admin/delivery-zones"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar a zona de entrega. Tente novamente."
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
                onClick={() => navigate('/admin/delivery-zones')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isEditing ? 'Salvar Alteracoes' : 'Criar Zona'}
              </Button>
            </>
          }
        >
          <FormField control={control} name="name" label="Nome" required>
            {(field) => (
              <Input
                {...field}
                placeholder="Ex: Centro, Zona Sul..."
              />
            )}
          </FormField>

          <FormField control={control} name="fee" label="Taxa de entrega" required>
            {(field) => (
              <PriceInput
                {...field}
                placeholder="0.00"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField control={control} name="min_delivery_time" label="Tempo minimo (min)" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  placeholder="Ex: 20"
                />
              )}
            </FormField>

            <FormField control={control} name="max_delivery_time" label="Tempo maximo (min)" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  placeholder="Ex: 40"
                />
              )}
            </FormField>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Bairros <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={neighborhoodInput}
                onChange={(e) => setNeighborhoodInput(e.target.value)}
                onKeyDown={handleNeighborhoodKeyDown}
                placeholder="Digite o nome do bairro e pressione Enter"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addNeighborhood}>
                Adicionar
              </Button>
            </div>
            {errors.neighborhoods && (
              <p className="text-xs text-red-500">{errors.neighborhoods.message}</p>
            )}
            {neighborhoods.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {neighborhoods.map((name: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeNeighborhood(index)}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </FormCard>
      </form>
    </div>
  );
}
