import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { FormCard } from '@/components/ui/FormCard';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGetUnitQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useGetTenantBySlugQuery,
} from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hifens'),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface BusinessHours {
  [day: string]: { open: boolean; openTime: string; closeTime: string };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terca' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: true, openTime: '08:00', closeTime: '22:00' },
  tuesday: { open: true, openTime: '08:00', closeTime: '22:00' },
  wednesday: { open: true, openTime: '08:00', closeTime: '22:00' },
  thursday: { open: true, openTime: '08:00', closeTime: '22:00' },
  friday: { open: true, openTime: '08:00', closeTime: '23:00' },
  saturday: { open: true, openTime: '09:00', closeTime: '23:00' },
  sunday: { open: true, openTime: '09:00', closeTime: '21:00' },
};

export default function UnitForm() {
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const tenantSlug = useAppSelector((s) => s.adminAuth.tenantSlug);

  const { data: unit, isLoading: loadingUnit } = useGetUnitQuery(id!, { skip: !id });
  const { data: tenant } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [createUnit, { isLoading: creating, error: createError }] = useCreateUnitMutation();
  const [updateUnit, { isLoading: updating, error: updateError }] = useUpdateUnitMutation();

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', address: '', phone: '', is_active: true },
  });

  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [useCustomHours, setUseCustomHours] = useState(false);

  const nameValue = watch('name');

  useEffect(() => {
    if (unit) {
      reset({ name: unit.name, slug: unit.slug, address: unit.address || '', phone: unit.phone || '', is_active: unit.is_active });
      if (unit.business_hours && Object.keys(unit.business_hours).length > 0) {
        setBusinessHours({ ...DEFAULT_HOURS, ...unit.business_hours });
        setUseCustomHours(true);
      }
    }
  }, [unit, reset]);

  useEffect(() => {
    if (!isEditing && nameValue) {
      const slug = nameValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  const copyFromTenant = () => {
    if (tenant?.business_hours) {
      setBusinessHours({ ...DEFAULT_HOURS, ...tenant.business_hours });
      setUseCustomHours(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        business_hours: useCustomHours ? businessHours : null,
      };
      if (isEditing) {
        await updateUnit({ id: id!, data: payload }).unwrap();
      } else {
        await createUnit(payload).unwrap();
      }
      notify.success(isEditing ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!');
      navigate('/admin/units');
    } catch (err: any) { notify.error(err?.data?.message || 'Erro ao salvar unidade.'); }
  };

  if (isEditing && loadingUnit) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  return (
    <>
      <PageHeader title={isEditing ? 'Editar Unidade' : 'Nova Unidade'} backTo="/admin/units" />

      <div className="max-w-2xl space-y-4">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <FormField control={control} name="name" label="Nome da Unidade">
              {(field) => <Input {...field} placeholder="Ex: Unidade Centro" />}
            </FormField>
            <FormField control={control} name="slug" label="Slug">
              {(field) => <Input {...field} placeholder="Ex: centro" />}
            </FormField>
            <FormField control={control} name="address" label="Endereço">
              {(field) => <Input {...field} placeholder="Rua, numero - Cidade" />}
            </FormField>
            <FormField control={control} name="phone" label="Telefone">
              {(field) => <Input {...field} placeholder="(11) 99999-0000" />}
            </FormField>
            <FormField control={control} name="is_active" label="Ativa">
              {(field) => <Toggle checked={field.value} onChange={field.onChange} />}
            </FormField>

            {/* Business Hours */}
            <FormCard>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Horario de Funcionamento</h3>
                  <p className="text-xs text-muted-foreground">Defina horários específicos para esta unidade</p>
                </div>
                <Toggle checked={useCustomHours} onChange={setUseCustomHours} />
              </div>

              {useCustomHours && (
                <>
                  <button type="button" onClick={copyFromTenant} className="flex items-center gap-1.5 text-xs text-primary font-medium mb-3 hover:text-primary-dark transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copiar do tenant principal
                  </button>
                  <div className="space-y-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const h = businessHours[day.key] || { open: false, openTime: '08:00', closeTime: '22:00' };
                      return (
                        <div key={day.key} className="flex items-center gap-3">
                          <Toggle
                            checked={h.open}
                            onChange={(checked) => setBusinessHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], open: checked } }))}
                          />
                          <span className="text-xs font-medium text-foreground w-16">{day.label}</span>
                          {h.open && (
                            <>
                              <input type="time" value={h.openTime} onChange={(e) => setBusinessHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], openTime: e.target.value } }))} className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground" />
                              <span className="text-xs text-muted-foreground">ate</span>
                              <input type="time" value={h.closeTime} onChange={(e) => setBusinessHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], closeTime: e.target.value } }))} className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground" />
                            </>
                          )}
                          {!h.open && <span className="text-xs text-muted-foreground">Fechado</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!useCustomHours && (
                <p className="text-xs text-muted-foreground">Usando horario do tenant principal.</p>
              )}
            </FormCard>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate('/admin/units')}>Cancelar</Button>
              <Button type="submit" loading={creating || updating}>{isEditing ? 'Salvar' : 'Criar Unidade'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
