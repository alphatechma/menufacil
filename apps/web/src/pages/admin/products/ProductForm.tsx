import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  useGetProductQuery,
  useGetCategoriesQuery,
  useGetExtraGroupsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@/api/adminApi';
import { productSchema, type ProductFormData } from '@/schemas/admin/productSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { PriceInput } from '@/components/ui/PriceInput';
import { Toggle } from '@/components/ui/Toggle';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: product, isLoading: isLoadingProduct } = useGetProductQuery(id!, { skip: !isEditing });
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: extraGroups = [] } = useGetExtraGroupsQuery();
  const [createProduct, { isLoading: isCreating, error: createError }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating, error: updateError }] = useUpdateProductMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const { control, handleSubmit, reset, register, watch, setValue } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      base_price: 0,
      category_id: '',
      image_url: null,
      is_pizza: false,
      is_active: true,
      sort_order: 0,
      variations: [],
      extra_group_ids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variations',
  });

  const watchedExtraGroupIds = watch('extra_group_ids');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name ?? '',
        description: product.description ?? '',
        base_price: product.base_price ?? 0,
        category_id: product.category_id ?? '',
        image_url: product.image_url ?? null,
        is_pizza: product.is_pizza ?? false,
        is_active: product.is_active ?? true,
        sort_order: product.sort_order ?? 0,
        variations: product.variations ?? [],
        extra_group_ids: product.extra_group_ids ?? [],
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditing) {
        await updateProduct({ id: id!, data }).unwrap();
      } else {
        await createProduct(data).unwrap();
      }
      navigate('/admin/products');
    } catch {
      // Error is captured by RTK Query and displayed via ErrorAlert
    }
  };

  const handleToggleExtraGroup = (groupId: string) => {
    const current = watchedExtraGroupIds ?? [];
    if (current.includes(groupId)) {
      setValue(
        'extra_group_ids',
        current.filter((id: string) => id !== groupId),
      );
    } else {
      setValue('extra_group_ids', [...current, groupId]);
    }
  };

  if (isEditing && isLoadingProduct) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Produto' : 'Novo Produto'}
        backTo="/admin/products"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar o produto. Tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <FormCard>
          <h2 className="text-lg font-semibold text-gray-900">Informacoes Basicas</h2>

          <FormField control={control} name="name" label="Nome" required>
            {(field) => (
              <Input
                {...field}
                placeholder="Ex: Pizza Margherita, Coca-Cola..."
              />
            )}
          </FormField>

          <FormField control={control} name="description" label="Descricao">
            {(field) => (
              <Textarea
                {...field}
                value={field.value ?? ''}
                placeholder="Descricao do produto (opcional)"
                rows={3}
              />
            )}
          </FormField>

          <FormField control={control} name="category_id" label="Categoria" required>
            {(field) => (
              <Select {...field}>
                <option value="">Selecione uma categoria</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField control={control} name="base_price" label="Preco Base" required>
            {(field) => (
              <PriceInput
                {...field}
                placeholder="0.00"
              />
            )}
          </FormField>

          <div className="flex items-center gap-8">
            <FormField control={control} name="is_pizza" label="E pizza?">
              {(field) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            </FormField>

            <FormField control={control} name="is_active" label="Produto ativo">
              {(field) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            </FormField>
          </div>

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
        </FormCard>

        {/* Image */}
        <FormCard>
          <h2 className="text-lg font-semibold text-gray-900">Imagem</h2>

          <FormField control={control} name="image_url" label="Imagem do Produto">
            {(field) => (
              <ImageUpload
                value={field.value}
                onChange={field.onChange}
              />
            )}
          </FormField>
        </FormCard>

        {/* Variations */}
        <FormCard>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Variacoes</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', price: 0 })}
            >
              <Plus className="w-4 h-4" />
              Adicionar Variacao
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma variacao cadastrada. Adicione variacoes como tamanhos ou sabores.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nome
                    </label>
                    <Input
                      {...register(`variations.${index}.name`)}
                      placeholder="Ex: Pequena, Media, Grande..."
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Preco
                    </label>
                    <PriceInput
                      {...register(`variations.${index}.price`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-7 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormCard>

        {/* Extra Groups */}
        <FormCard>
          <h2 className="text-lg font-semibold text-gray-900">Grupos de Extras</h2>

          {extraGroups.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum grupo de extras disponivel.
            </p>
          ) : (
            <div className="space-y-3">
              {extraGroups.map((group: any) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={watchedExtraGroupIds?.includes(group.id) ?? false}
                    onChange={() => handleToggleExtraGroup(group.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{group.name}</span>
                    {group.description && (
                      <p className="text-xs text-gray-500">{group.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </FormCard>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/products')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={isSaving}>
            {isEditing ? 'Salvar Alteracoes' : 'Criar Produto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
