import { useState } from 'react';
import {
  Tag,
  Percent,
  Clock,
  Calendar,
  Gift,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  useGetPromotionsQuery,
  useDeletePromotionMutation,
  useUpdatePromotionMutation,
} from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import PromotionFormModal from './PromotionFormModal';

const TYPE_LABELS: Record<string, string> = {
  combo: 'Combo',
  happy_hour: 'Happy Hour',
  weekday: 'Dia da Semana',
  buy_x_get_y: 'Compre X Leve Y',
  discount: 'Desconto',
};

const TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  combo: 'info',
  happy_hour: 'warning',
  weekday: 'success',
  buy_x_get_y: 'danger',
  discount: 'default',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function PromotionList() {
  const { data: promotions = [], isLoading } = useGetPromotionsQuery();
  const [deletePromotion] = useDeletePromotionMutation();
  const [updatePromotion] = useUpdatePromotionMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggleActive = async (promo: any) => {
    await updatePromotion({ id: promo.id, data: { is_active: !promo.is_active } });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePromotion(deleteId);
      setDeleteId(null);
    }
  };

  const handleEdit = (promo: any) => {
    setEditingPromo(promo);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingPromo(null);
    setFormOpen(true);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Promocoes"
        actions={
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Promocao
          </Button>
        }
      />

      {promotions.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-12 h-12 text-gray-300" />}
          title="Nenhuma promoção"
          description="Crie sua primeira promoção para atrair mais clientes."
        />
      ) : (
        <div className="grid gap-4">
          {promotions.map((promo: any) => (
            <div
              key={promo.id}
              className={cn(
                'bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5 transition-all hover:shadow-md',
                !promo.is_active && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-foreground truncate">
                      {promo.name}
                    </h3>
                    <Badge variant={TYPE_COLORS[promo.type] || 'default'}>
                      {TYPE_LABELS[promo.type] || promo.type}
                    </Badge>
                    {!promo.is_active && (
                      <Badge variant="danger">Inativa</Badge>
                    )}
                  </div>

                  {promo.description && (
                    <p className="text-sm text-gray-500 dark:text-muted-foreground mb-2">
                      {promo.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      {promo.discount_type === 'percent'
                        ? `${promo.discount_value}%`
                        : formatPrice(promo.discount_value)}
                    </span>

                    {promo.schedule?.days && promo.schedule.days.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {promo.schedule.days.map((d: number) => DAY_LABELS[d]).join(', ')}
                      </span>
                    )}

                    {promo.schedule?.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {promo.schedule.start_time} - {promo.schedule.end_time || '23:59'}
                      </span>
                    )}

                    {promo.valid_from && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(promo.valid_from).toLocaleDateString('pt-BR')}
                        {promo.valid_to && ` - ${new Date(promo.valid_to).toLocaleDateString('pt-BR')}`}
                      </span>
                    )}

                    {promo.type === 'buy_x_get_y' && promo.rules && (
                      <span className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        Compre {promo.rules.buy_quantity} Leve {(promo.rules.buy_quantity || 0) + (promo.rules.get_quantity || 0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(promo)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      promo.is_active
                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-muted',
                    )}
                    title={promo.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {promo.is_active ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-muted-foreground dark:hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(promo.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromotionFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPromo(null);
        }}
        promotion={editingPromo}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Promocao"
        message="Tem certeza que deseja excluir esta promoção? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  );
}
