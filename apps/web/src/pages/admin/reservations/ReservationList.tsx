import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  CheckCircle,
  UserX,
  Phone,
  Users,
  Clock,
  StickyNote,
} from 'lucide-react';
import {
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationStatusMutation,
} from '@/api/adminApi';
import { useNotify } from '@/hooks/useNotify';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormCard } from '@/components/ui/FormCard';
import { FormField } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListPageSkeleton } from '@/components/ui/Skeleton';

// --- Types ---

type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  date: string;
  time_start: string;
  status: ReservationStatus;
  notes?: string;
  created_at: string;
}

// --- Constants ---

const STATUS_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'completed', label: 'Concluidas' },
  { key: 'no_show', label: 'No-show' },
];

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
  completed: { label: 'Concluida', variant: 'info' },
  no_show: { label: 'No-show', variant: 'default' },
};

// --- Form Schema ---

const reservationSchema = z.object({
  customer_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  customer_phone: z.string().min(8, 'Telefone inválido'),
  party_size: z.coerce.number().min(1, 'Mínimo 1 pessoa').max(100, 'Máximo 100 pessoas'),
  date: z.string().min(1, 'Data obrigatória'),
  time_start: z.string().min(1, 'Horário obrigatório'),
  notes: z.string().optional(),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

// --- Component ---

export default function ReservationList() {
  const notify = useNotify();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Build query params
  const queryParams = useMemo(() => {
    const params: { date?: string; status?: string } = {};
    if (dateFilter) params.date = dateFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    return params;
  }, [dateFilter, statusFilter]);

  const { data: reservations = [], isLoading } = useGetReservationsQuery(queryParams);
  const [createReservation, { isLoading: isCreating }] = useCreateReservationMutation();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateReservationStatusMutation();

  const { control, handleSubmit, reset } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      party_size: 2,
      date: '',
      time_start: '',
      notes: '',
    },
  });

  // --- Handlers ---

  const handleOpenModal = () => {
    reset({
      customer_name: '',
      customer_phone: '',
      party_size: 2,
      date: '',
      time_start: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const onSubmit = async (data: ReservationFormData) => {
    try {
      await createReservation(data).unwrap();
      notify.success('Reserva criada com sucesso!');
      handleCloseModal();
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao criar reserva.');
    }
  };

  const handleUpdateStatus = async (id: string, status: ReservationStatus) => {
    try {
      await updateStatus({ id, status }).unwrap();
      notify.success('Status da reserva atualizado!');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao atualizar status da reserva.');
    }
  };

  // --- Table columns ---

  const columns = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (r: Reservation) => (
        <div>
          <p className="font-medium text-foreground">{r.customer_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" />
            {r.customer_phone}
          </p>
        </div>
      ),
    },
    {
      key: 'party_size',
      header: 'Pessoas',
      render: (r: Reservation) => (
        <span className="inline-flex items-center gap-1 text-foreground">
          <Users className="w-4 h-4 text-muted-foreground" />
          {r.party_size}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Data',
      render: (r: Reservation) => (
        <span className="text-foreground">
          {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Horario',
      render: (r: Reservation) => (
        <span className="inline-flex items-center gap-1 text-foreground">
          <Clock className="w-4 h-4 text-muted-foreground" />
          {r.time_start}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Reservation) => {
        const config = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'notes',
      header: 'Observacoes',
      render: (r: Reservation) =>
        r.notes ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] truncate" title={r.notes}>
            <StickyNote className="w-3 h-3 shrink-0" />
            {r.notes}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (r: Reservation) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(r.id, 'confirmed')}
              disabled={isUpdating}
              title="Confirmar"
            >
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="hidden sm:inline ml-1">Confirmar</span>
            </Button>
          )}
          {(r.status === 'pending' || r.status === 'confirmed') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(r.id, 'cancelled')}
              disabled={isUpdating}
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="hidden sm:inline ml-1">Cancelar</span>
            </Button>
          )}
          {r.status === 'confirmed' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(r.id, 'completed')}
                disabled={isUpdating}
                title="Concluir"
              >
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline ml-1">Concluir</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(r.id, 'no_show')}
                disabled={isUpdating}
                title="No-show"
              >
                <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline ml-1">No-show</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // --- Render ---

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Reservas"
        actions={
          <Button onClick={handleOpenModal}>
            <Plus className="w-4 h-4" />
            Nova Reserva
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />
          {dateFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDateFilter('')}
              title="Limpar filtro de data"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Tabs tabs={STATUS_TABS} activeTab={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Content */}
      {reservations.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-12 h-12" />}
          title="Nenhuma reserva encontrada"
          description={
            dateFilter || statusFilter !== 'all'
              ? 'Tente alterar os filtros para ver mais resultados.'
              : 'Ainda nao ha reservas registradas. Crie a primeira reserva.'
          }
          action={
            !dateFilter && statusFilter === 'all' ? (
              <Button onClick={handleOpenModal} className="mt-2">
                <Plus className="w-4 h-4" />
                Nova Reserva
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table<Reservation>
          columns={columns}
          data={reservations}
          keyExtractor={(r) => r.id}
        />
      )}

      {/* Create Reservation Modal */}
      <Modal open={isModalOpen} onClose={handleCloseModal} title="Nova Reserva">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormCard
            footer={
              <>
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isCreating}>
                  <Plus className="w-4 h-4" />
                  Criar Reserva
                </Button>
              </>
            }
          >
            <FormField control={control} name="customer_name" label="Nome do cliente" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="Ex: Joao Silva"
                  autoFocus
                />
              )}
            </FormField>

            <FormField control={control} name="customer_phone" label="Telefone" required>
              {(field) => (
                <Input
                  {...field}
                  type="tel"
                  placeholder="(11) 99999-9999"
                />
              )}
            </FormField>

            <FormField control={control} name="party_size" label="Numero de pessoas" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  max={100}
                  placeholder="2"
                />
              )}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="date" label="Data" required>
                {(field) => (
                  <Input
                    {...field}
                    type="date"
                  />
                )}
              </FormField>

              <FormField control={control} name="time_start" label="Horario" required>
                {(field) => (
                  <Input
                    {...field}
                    type="time"
                  />
                )}
              </FormField>
            </div>

            <FormField control={control} name="notes" label="Observacoes">
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Aniversario, preferencia de mesa, alergias..."
                />
              )}
            </FormField>
          </FormCard>
        </form>
      </Modal>
    </div>
  );
}
