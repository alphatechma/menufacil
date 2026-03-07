import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Check, AlertCircle } from 'lucide-react';
import {
  useGetStaffMemberQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useGetRolesQuery,
} from '@/api/adminApi';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormCard } from '@/components/ui/FormCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

const staffSchema = z.object({
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

export default function StaffForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: member, isLoading: isLoadingMember } = useGetStaffMemberQuery(id!, { skip: !isEditing });
  const { data: customRoles = [] } = useGetRolesQuery();
  const [createStaff, { isLoading: isCreating, error: createError }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating, error: updateError }] = useUpdateStaffMutation();

  const isSaving = isCreating || isUpdating;
  const error = createError || updateError;

  const { control, handleSubmit, reset } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      is_active: true,
    },
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      reset({
        name: member.name ?? '',
        email: member.email ?? '',
        password: '',
        is_active: member.is_active ?? true,
      });
      setSelectedRoleId(member.role_id || null);
    }
  }, [member, reset]);

  const onSubmit = async (data: StaffFormData) => {
    if (!selectedRoleId) return;

    try {
      if (isEditing) {
        const updateData: any = {
          name: data.name,
          is_active: data.is_active,
          role_id: selectedRoleId,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await updateStaff({ id: id!, data: updateData }).unwrap();
        toast.success('Membro atualizado com sucesso');
      } else {
        await createStaff({
          name: data.name,
          email: data.email,
          password: data.password!,
          role_id: selectedRoleId,
        }).unwrap();
        toast.success('Membro criado com sucesso');
      }
      navigate('/admin/staff');
    } catch {
      toast.error('Erro ao salvar o membro');
    }
  };

  if (isEditing && isLoadingMember) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Membro' : 'Novo Membro'}
        backTo="/admin/staff"
      />

      {!!error && (
        <ErrorAlert
          message="Erro ao salvar. Verifique os dados e tente novamente."
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormCard>
          <h2 className="text-lg font-semibold text-foreground">Informacoes</h2>

          <FormField control={control} name="name" label="Nome" required>
            {(field) => <Input {...field} placeholder="Nome completo" />}
          </FormField>

          <FormField control={control} name="email" label="Email" required>
            {(field) => (
              <Input
                {...field}
                type="email"
                placeholder="email@exemplo.com"
                disabled={isEditing}
              />
            )}
          </FormField>

          <FormField
            control={control}
            name="password"
            label={isEditing ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
            required={!isEditing}
          >
            {(field) => (
              <Input
                {...field}
                type="password"
                placeholder={isEditing ? 'Deixe vazio para manter' : 'Minimo 6 caracteres'}
              />
            )}
          </FormField>

          {isEditing && (
            <FormField control={control} name="is_active" label="Membro ativo">
              {(field) => (
                <Toggle checked={field.value} onChange={field.onChange} />
              )}
            </FormField>
          )}
        </FormCard>

        {/* Role selection - Only custom profiles */}
        <FormCard>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Perfil de Acesso <span className="text-red-500">*</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione o perfil que define as permissoes deste membro.
          </p>

          {customRoles.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Nenhum perfil cadastrado
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Crie ao menos um perfil de acesso antes de adicionar membros.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/staff/roles/new')}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Criar perfil agora
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {customRoles.map((cr: any) => {
                const isSelected = selectedRoleId === cr.id;
                return (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => setSelectedRoleId(cr.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                        {cr.name}
                      </p>
                      {cr.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cr.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cr.permissions?.length || 0} permissao(es)
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!selectedRoleId && customRoles.length > 0 && (
            <p className="text-xs text-red-500 mt-2">Selecione um perfil de acesso</p>
          )}
        </FormCard>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/staff')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSaving}
            disabled={!selectedRoleId || customRoles.length === 0}
          >
            {isEditing ? 'Salvar Alteracoes' : 'Criar Membro'}
          </Button>
        </div>
      </form>
    </div>
  );
}
