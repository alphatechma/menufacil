import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCog, DollarSign } from 'lucide-react';
import {
  useGetDeliveryPersonQuery,
  useCreateDeliveryPersonMutation,
  useUpdateDeliveryPersonMutation,
  useGetStaffQuery,
} from '@/api/adminApi';
import { deliveryPersonSchema, type DeliveryPersonFormData } from '@/schemas/admin/deliveryPersonSchema';
import { useNotify } from '@/hooks/useNotify';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Toggle } from '@/components/ui/Toggle';
import { FormPageSkeleton } from '@/components/ui/Skeleton';

const COMMISSION_TYPES = [
  { value: 'none', label: 'Sem comissão', desc: 'Entregador não recebe comissão por entrega' },
  { value: 'fixed', label: 'Valor fixo por entrega', desc: 'Valor fixo em R$ por cada entrega concluída' },
  { value: 'percent', label: 'Percentual do pedido', desc: 'Percentual sobre o valor total do pedido' },
];

export default function DeliveryPersonForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const isEditing = !!id;

  const { data: person, isLoading: isLoadingPerson } = useGetDeliveryPersonQuery(id!, { skip: !isEditing });
  const { data: staff = [] } = useGetStaffQuery();
  const [createPerson, { isLoading: isCreating, error: createError }] = useCreateDeliveryPersonMutation();
  const [updatePerson, { isLoading: isUpdating, error: updateError }] = useUpdateDeliveryPersonMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [commissionType, setCommissionType] = useState<string>('none');
  const [commissionValue, setCommissionValue] = useState<string>('0');
  const [receivesDeliveryFee, setReceivesDeliveryFee] = useState(false);

  const { control, handleSubmit, reset } = useForm<DeliveryPersonFormData>({
    resolver: zodResolver(deliveryPersonSchema),
    defaultValues: {
      name: '',
      phone: '',
      vehicle: '',
    },
  });

  useEffect(() => {
    if (person) {
      reset({
        name: person.name ?? '',
        phone: person.phone ?? '',
        vehicle: person.vehicle ?? '',
      });
      setSelectedUserId(person.user_id ?? '');
      setCommissionType(person.commission_type ?? 'none');
      setCommissionValue(String(person.commission_value ?? 0));
      setReceivesDeliveryFee(person.receives_delivery_fee ?? false);
    }
  }, [person, reset]);

  const onSubmit = async (data: DeliveryPersonFormData) => {
    try {
      const payload = {
        ...data,
        user_id: selectedUserId || undefined,
        commission_type: commissionType,
        commission_value: parseFloat(commissionValue) || 0,
        receives_delivery_fee: receivesDeliveryFee,
      };
      if (isEditing) {
        await updatePerson({ id: id!, data: payload }).unwrap();
      } else {
        await createPerson(payload).unwrap();
      }
      notify.success(isEditing ? 'Entregador atualizado com sucesso!' : 'Entregador cadastrado com sucesso!');
      navigate('/admin/delivery-persons');
    } catch {
      notify.error('Erro ao salvar o entregador. Tente novamente.');
    }
  };

  if (isEditing && isLoadingPerson) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Entregador' : 'Novo Entregador'}
        backTo="/admin/delivery-persons"
      />

      {!!error && (
        <ErrorAlert
          message="Ocorreu um erro ao salvar o entregador. Tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormCard
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/delivery-persons')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isEditing ? 'Salvar Alteracoes' : 'Cadastrar Entregador'}
              </Button>
            </>
          }
        >
          <FormField control={control} name="name" label="Nome" required>
            {(field) => (
              <Input {...field} placeholder="Nome completo do entregador" />
            )}
          </FormField>

          <FormField control={control} name="phone" label="Telefone" required>
            {(field) => (
              <Input {...field} placeholder="(00) 00000-0000" />
            )}
          </FormField>

          <FormField control={control} name="vehicle" label="Veiculo">
            {(field) => (
              <Input {...field} placeholder="Ex: Moto, Bicicleta, Carro..." />
            )}
          </FormField>
        </FormCard>

        {/* Commission */}
        <FormCard>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-foreground">Comissao por Entrega</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure quanto o entregador recebe por cada entrega concluída.
          </p>

          <div className="space-y-3">
            {COMMISSION_TYPES.map((ct) => (
              <label
                key={ct.value}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  commissionType === ct.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="commission_type"
                  value={ct.value}
                  checked={commissionType === ct.value}
                  onChange={(e) => {
                    setCommissionType(e.target.value);
                    if (e.target.value === 'none') setCommissionValue('0');
                  }}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${commissionType === ct.value ? 'text-foreground' : 'text-foreground'}`}>
                    {ct.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ct.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {commissionType !== 'none' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {commissionType === 'fixed' ? 'Valor por entrega (R$)' : 'Percentual por entrega (%)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  {commissionType === 'fixed' ? 'R$' : '%'}
                </span>
                <input
                  type="number"
                  step={commissionType === 'fixed' ? '0.50' : '0.5'}
                  min="0"
                  max={commissionType === 'percent' ? '100' : undefined}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={commissionType === 'fixed' ? '5.00' : '10'}
                />
              </div>
              {commissionType === 'fixed' && parseFloat(commissionValue) > 0 && (
                <p className="text-xs text-green-600 font-medium mt-1.5">
                  O entregador recebera {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(commissionValue))} por entrega concluída.
                </p>
              )}
              {commissionType === 'percent' && parseFloat(commissionValue) > 0 && (
                <p className="text-xs text-green-600 font-medium mt-1.5">
                  O entregador recebera {commissionValue}% do valor total de cada pedido entregue.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Recebe taxa de entrega</p>
                <p className="text-xs text-muted-foreground">O entregador recebe o valor integral da taxa de entrega cobrada do cliente</p>
              </div>
              <Toggle checked={receivesDeliveryFee} onChange={setReceivesDeliveryFee} />
            </div>
          </div>
        </FormCard>

        {/* User link */}
        <FormCard>
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-foreground">Vincular Acesso ao Sistema</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Vincule este entregador a um usuario do sistema para que ele possa acessar o painel "Minhas Entregas".
          </p>

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card text-foreground"
          >
            <option value="">Nenhum (sem acesso ao sistema)</option>
            {staff
              .filter((s: any) => s.is_active)
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
          </select>

          {selectedUserId && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              O entregador podera acessar o painel com as credenciais do usuario selecionado.
            </p>
          )}
        </FormCard>
      </form>
    </div>
  );
}
