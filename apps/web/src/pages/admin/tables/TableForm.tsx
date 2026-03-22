import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
} from '@/api/adminApi';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { useNotify } from '@/hooks/useNotify';

const tableSchema = z.object({
  number: z.coerce
    .number({ invalid_type_error: 'Informe um numero valido' })
    .min(1, 'O numero da mesa deve ser no minimo 1'),
  label: z.string().optional().default(''),
  capacity: z.coerce
    .number({ invalid_type_error: 'Informe um numero valido' })
    .min(1, 'A capacidade deve ser no minimo 1')
    .optional()
    .or(z.literal('')),
});

type TableFormData = z.infer<typeof tableSchema>;

export default function TableForm() {
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: tables = [], isLoading: isLoadingTables } = useGetTablesQuery(
    undefined,
    { skip: !isEditing },
  );
  const table = isEditing ? tables.find((t: any) => t.id === id) : undefined;

  const [createTable, { isLoading: isCreating, error: createError }] =
    useCreateTableMutation();
  const [updateTable, { isLoading: isUpdating, error: updateError }] =
    useUpdateTableMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const { control, handleSubmit, reset } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      number: '' as any,
      label: '',
      capacity: '' as any,
    },
  });

  useEffect(() => {
    if (table) {
      reset({
        number: table.number ?? '',
        label: table.label ?? '',
        capacity: table.capacity ?? '',
      });
    }
  }, [table, reset]);

  const onSubmit = async (data: TableFormData) => {
    const payload: any = {
      number: data.number,
      label: data.label || undefined,
      capacity: data.capacity || undefined,
    };

    try {
      if (isEditing) {
        await updateTable({ id: id!, data: payload }).unwrap();
      } else {
        await createTable(payload).unwrap();
      }
      notify.success(isEditing ? 'Mesa atualizada com sucesso!' : 'Mesa criada com sucesso!');
      navigate('/admin/tables');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao salvar mesa.');
    }
  };

  if (isEditing && isLoadingTables) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        title={
          isEditing ? `Editar Mesa #${table?.number ?? ''}` : 'Nova Mesa'
        }
        backTo="/admin/tables"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar a mesa. Tente novamente."
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
                onClick={() => navigate('/admin/tables')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isEditing ? 'Salvar Alteracoes' : 'Criar Mesa'}
              </Button>
            </>
          }
        >
          <FormField control={control} name="number" label="Numero da mesa" required>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="Ex: 1, 2, 3..."
              />
            )}
          </FormField>

          <FormField control={control} name="label" label="Identificacao (opcional)">
            {(field) => (
              <Input
                {...field}
                value={field.value ?? ''}
                placeholder="Ex: Varanda, Area VIP, Terraco..."
              />
            )}
          </FormField>

          <FormField control={control} name="capacity" label="Capacidade (lugares)">
            {(field) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="Ex: 4"
              />
            )}
          </FormField>
        </FormCard>
      </form>
    </div>
  );
}
