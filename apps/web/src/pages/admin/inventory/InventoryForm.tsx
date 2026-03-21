import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetInventoryItemQuery, useCreateInventoryItemMutation, useUpdateInventoryItemMutation } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().min(1),
  current_stock: z.coerce.number().min(0).optional(),
  min_stock: z.coerce.number().min(0).optional(),
  cost_price: z.coerce.number().min(0).optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function InventoryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: item, isLoading } = useGetInventoryItemQuery(id!, { skip: !id });
  const [createItem, { isLoading: creating }] = useCreateInventoryItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateInventoryItemMutation();

  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', sku: '', unit: 'un', current_stock: 0, min_stock: 0, cost_price: 0, category: '', supplier: '' },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name, description: item.description || '', sku: item.sku || '',
        unit: item.unit, current_stock: Number(item.current_stock), min_stock: Number(item.min_stock),
        cost_price: Number(item.cost_price), category: item.category || '', supplier: item.supplier || '',
      });
    }
  }, [item, reset]);

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateItem({ id: id!, data }).unwrap();
    } else {
      await createItem(data).unwrap();
    }
    navigate('/admin/inventory');
  };

  if (isEditing && isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <>
      <PageHeader title={isEditing ? 'Editar Insumo' : 'Novo Insumo'} backTo="/admin/inventory" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={control} name="name" label="Nome" required>
              {(field) => <Input {...field} placeholder="Ex: Mussarela fatiada" />}
            </FormField>
            <FormField control={control} name="sku" label="Codigo (SKU)">
              {(field) => <Input {...field} placeholder="Ex: MUS-001" />}
            </FormField>
          </div>

          <FormField control={control} name="description" label="Descricao">
            {(field) => <Input {...field} placeholder="Descricao do insumo" />}
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={control} name="unit" label="Unidade de medida">
              {(field) => (
                <Select {...field}>
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="g">Grama (g)</option>
                  <option value="L">Litro (L)</option>
                  <option value="mL">Mililitro (mL)</option>
                  <option value="pct">Pacote (pct)</option>
                </Select>
              )}
            </FormField>
            <FormField control={control} name="current_stock" label="Estoque atual">
              {(field) => <Input {...field} type="number" step="0.1" min="0" />}
            </FormField>
            <FormField control={control} name="min_stock" label="Estoque minimo">
              {(field) => <Input {...field} type="number" step="0.1" min="0" />}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={control} name="cost_price" label="Custo unitario (R$)">
              {(field) => <Input {...field} type="number" step="0.01" min="0" />}
            </FormField>
            <FormField control={control} name="category" label="Categoria">
              {(field) => <Input {...field} placeholder="Ex: Proteinas, Hortifruti" />}
            </FormField>
            <FormField control={control} name="supplier" label="Fornecedor">
              {(field) => <Input {...field} placeholder="Nome do fornecedor" />}
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/inventory')}>Cancelar</Button>
            <Button type="submit" loading={creating || updating}>{isEditing ? 'Salvar' : 'Criar Insumo'}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
