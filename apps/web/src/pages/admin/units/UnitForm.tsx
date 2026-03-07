import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGetUnitQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
} from '@/api/adminApi';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  slug: z.string().min(1, 'Slug obrigatorio').regex(/^[a-z0-9-]+$/, 'Apenas letras minusculas, numeros e hifens'),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function UnitForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: unit, isLoading: loadingUnit } = useGetUnitQuery(id!, { skip: !id });
  const [createUnit, { isLoading: creating, error: createError }] = useCreateUnitMutation();
  const [updateUnit, { isLoading: updating, error: updateError }] = useUpdateUnitMutation();

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', address: '', phone: '', is_active: true },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (unit) {
      reset({
        name: unit.name,
        slug: unit.slug,
        address: unit.address || '',
        phone: unit.phone || '',
        is_active: unit.is_active,
      });
    }
  }, [unit, reset]);

  // Auto-generate slug from name (only for new units)
  useEffect(() => {
    if (!isEditing && nameValue) {
      const slug = nameValue
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [nameValue, isEditing, setValue]);

  const apiError = createError || updateError;
  const errorMessage = apiError
    ? (apiError as any)?.data?.message
      ? Array.isArray((apiError as any).data.message)
        ? (apiError as any).data.message.join(', ')
        : (apiError as any).data.message
      : 'Erro ao salvar unidade'
    : null;

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateUnit({ id: id!, data }).unwrap();
      } else {
        const { is_active, ...createData } = data;
        await createUnit(createData).unwrap();
      }
      navigate('/admin/units');
    } catch {
      // error is captured by RTK Query state
    }
  };

  if (isEditing && loadingUnit) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  return (
    <>
      <PageHeader
        title={isEditing ? 'Editar Unidade' : 'Nova Unidade'}
        backTo="/admin/units"
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {errorMessage && <ErrorAlert message={errorMessage} />}
          <FormField control={control} name="name" label="Nome da Unidade">
            {(field) => <Input {...field} placeholder="Ex: Unidade Centro" />}
          </FormField>

          <FormField control={control} name="slug" label="Slug">
            {(field) => <Input {...field} placeholder="Ex: centro" />}
          </FormField>

          <FormField control={control} name="address" label="Endereco">
            {(field) => <Input {...field} placeholder="Rua, numero - Cidade" />}
          </FormField>

          <FormField control={control} name="phone" label="Telefone">
            {(field) => <Input {...field} placeholder="(11) 99999-0000" />}
          </FormField>

          {isEditing && (
            <FormField control={control} name="is_active" label="Ativa">
              {(field) => <Toggle checked={field.value} onChange={field.onChange} />}
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/units')}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating || updating}>
              {isEditing ? 'Salvar' : 'Criar Unidade'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
