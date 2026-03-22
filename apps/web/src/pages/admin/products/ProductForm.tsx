import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

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
      is_active: true,
      sort_order: 0,
      min_variations: 0,
      max_variations: 0,
      dietary_tags: [],
      variations: [],
      extra_group_ids: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'variations',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleVariationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
    }
  };

  const watchedExtraGroupIds = watch('extra_group_ids');
  const watchedDietaryTags = watch('dietary_tags');

  const DIETARY_TAG_OPTIONS = [
    { key: 'vegetariano', label: 'Vegetariano' },
    { key: 'vegano', label: 'Vegano' },
    { key: 'sem_gluten', label: 'Sem Gluten' },
    { key: 'sem_lactose', label: 'Sem Lactose' },
  ];

  const handleToggleDietaryTag = (tag: string) => {
    const current = watchedDietaryTags ?? [];
    if (current.includes(tag)) {
      setValue('dietary_tags', current.filter((t: string) => t !== tag));
    } else {
      setValue('dietary_tags', [...current, tag]);
    }
  };

  useEffect(() => {
    if (product) {
      reset({
        name: product.name ?? '',
        description: product.description ?? '',
        base_price: product.base_price ?? 0,
        category_id: product.category_id ?? '',
        image_url: product.image_url ?? null,
        is_active: product.is_active ?? true,
        sort_order: product.sort_order ?? 0,
        min_variations: product.min_variations ?? 0,
        max_variations: product.max_variations ?? 0,
        dietary_tags: product.dietary_tags ?? [],
        variations: product.variations?.map((v: any) => ({ name: v.name, description: v.description ?? '', price: Number(v.price) })) ?? [],
        extra_group_ids: product.extra_groups?.map((g: any) => g.id) ?? [],
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditing) {
        await updateProduct({ id: id!, data }).unwrap();
        toast.success('Produto atualizado com sucesso');
      } else {
        await createProduct(data).unwrap();
        toast.success('Produto criado com sucesso');
      }
      navigate('/admin/products');
    } catch {
      toast.error('Erro ao salvar o produto');
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

  if (isEditing && isLoadingProduct) return <FormPageSkeleton />;

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
          <h2 className="text-lg font-semibold text-foreground">Informacoes Basicas</h2>

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

          <FormField control={control} name="is_active" label="Produto ativo">
            {(field) => (
              <Toggle
                checked={field.value}
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
        </FormCard>

        {/* Image */}
        <FormCard>
          <h2 className="text-lg font-semibold text-foreground">Imagem</h2>

          <FormField control={control} name="image_url" label="Imagem do Produto">
            {(field) => (
              <ImageUpload
                value={field.value}
                onChange={field.onChange}
              />
            )}
          </FormField>
        </FormCard>

        {/* Dietary Tags */}
        <FormCard>
          <h2 className="text-lg font-semibold text-foreground">Tags Alimentares</h2>
          <p className="text-xs text-muted-foreground">
            Selecione as restricoes alimentares que se aplicam a este produto.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {DIETARY_TAG_OPTIONS.map((tag) => (
              <label
                key={tag.key}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-accent cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={watchedDietaryTags?.includes(tag.key) ?? false}
                  onChange={() => handleToggleDietaryTag(tag.key)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">{tag.label}</span>
              </label>
            ))}
          </div>
        </FormCard>

        {/* Variations */}
        <FormCard>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Variacoes</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', description: '', price: 0 })}
            >
              <Plus className="w-4 h-4" />
              Adicionar Variacao
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField control={control} name="min_variations" label="Minimo de selecoes">
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    placeholder="0 = opcional"
                  />
                )}
              </FormField>
              <FormField control={control} name="max_variations" label="Maximo de selecoes">
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    placeholder="0 = sem limite"
                  />
                )}
              </FormField>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Min=0, Max=0: opcional. Min=1, Max=1: obrigatorio (selecao unica). Min=1, Max=2: escolher de 1 a 2.
          </p>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma variacao cadastrada. Adicione variacoes como tamanhos ou sabores.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVariationDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <SortableVariation key={field.id} id={field.id} index={index} register={register} onRemove={() => remove(index)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </FormCard>

        {/* Extra Groups */}
        <FormCard>
          <h2 className="text-lg font-semibold text-foreground">Grupos de Extras</h2>

          {extraGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo de extras disponivel.
            </p>
          ) : (
            <div className="space-y-3">
              {extraGroups.map((group: any) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={watchedExtraGroupIds?.includes(group.id) ?? false}
                    onChange={() => handleToggleExtraGroup(group.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-foreground">{group.name}</span>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
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

function SortableVariation({ id, index, register, onRemove }: { id: string; index: number; register: any; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 bg-muted/50 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-7 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
          <Input {...register(`variations.${index}.name`)} placeholder="Ex: Pequena, Media, Grande..." />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">Preco</label>
          <PriceInput {...register(`variations.${index}.price`, { valueAsNumber: true })} placeholder="0.00" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-7 p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="pl-8">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Descricao <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <Input {...register(`variations.${index}.description`)} placeholder="Ex: 500ml, serve 2 pessoas..." />
      </div>
    </div>
  );
}
