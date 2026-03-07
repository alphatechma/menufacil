import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetCategoryQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '@/api/adminApi';
import { categorySchema, type CategoryFormData } from '@/schemas/admin/categorySchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

export default function CategoryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: category, isLoading: isLoadingCategory } = useGetCategoryQuery(id!, { skip: !isEditing });
  const [createCategory, { isLoading: isCreating, error: createError }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating, error: updateError }] = useUpdateCategoryMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const { control, handleSubmit, reset } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      image_url: null,
      sort_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name ?? '',
        description: category.description ?? '',
        image_url: category.image_url ?? null,
        sort_order: category.sort_order ?? 0,
        is_active: category.is_active ?? true,
      });
    }
  }, [category, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditing) {
        await updateCategory({ id: id!, data }).unwrap();
        toast.success('Categoria atualizada com sucesso');
      } else {
        await createCategory(data).unwrap();
        toast.success('Categoria criada com sucesso');
      }
      navigate('/admin/categories');
    } catch {
      toast.error('Erro ao salvar a categoria');
    }
  };

  if (isEditing && isLoadingCategory) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Categoria' : 'Nova Categoria'}
        backTo="/admin/categories"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar a categoria. Tente novamente."
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
                onClick={() => navigate('/admin/categories')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isEditing ? 'Salvar Alteracoes' : 'Criar Categoria'}
              </Button>
            </>
          }
        >
          <FormField control={control} name="name" label="Nome" required>
            {(field) => (
              <Input
                {...field}
                placeholder="Ex: Pizzas, Bebidas, Sobremesas..."
              />
            )}
          </FormField>

          <FormField control={control} name="description" label="Descricao">
            {(field) => (
              <Textarea
                {...field}
                value={field.value ?? ''}
                placeholder="Descricao da categoria (opcional)"
                rows={3}
              />
            )}
          </FormField>

          <FormField control={control} name="image_url" label="Imagem">
            {(field) => (
              <ImageUpload
                value={field.value}
                onChange={field.onChange}
              />
            )}
          </FormField>

          <FormField control={control} name="sort_order" label="Ordem de exibicao">
            {(field) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="0"
              />
            )}
          </FormField>

          <FormField control={control} name="is_active" label="Categoria ativa">
            {(field) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          </FormField>
        </FormCard>
      </form>
    </div>
  );
}
