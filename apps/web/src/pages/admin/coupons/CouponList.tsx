import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { useGetCouponsQuery, useDeleteCouponMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function CouponList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);

  const { data: coupons = [], isLoading } = useGetCouponsQuery();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const term = search.toLowerCase();
    return coupons.filter((coupon: any) =>
      coupon.code?.toLowerCase().includes(term),
    );
  }, [coupons, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoupon(deleteTarget.id).unwrap();
      toast.success('Cupom excluido com sucesso!');
    } catch {
      toast.error('Erro ao excluir cupom. Tente novamente.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
        <Link to="/admin/coupons/new">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Cupom
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por codigo..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Ticket className="w-12 h-12" />}
          title="Nenhum cupom encontrado"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Crie seu primeiro cupom de desconto.'
          }
          action={
            !search ? (
              <Link to="/admin/coupons/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Novo Cupom
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Codigo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pedido Min
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Usos
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Validade
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((coupon: any) => (
                  <tr key={coupon.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.discount_type === 'percent' ? (
                        <Badge variant="info">Percentual</Badge>
                      ) : (
                        <Badge variant="success">Fixo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {coupon.discount_type === 'percent'
                        ? `${coupon.discount_value}%`
                        : formatPrice(coupon.discount_value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {coupon.min_order ? formatPrice(coupon.min_order) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {coupon.current_uses ?? 0}/{coupon.max_uses ?? '\u221E'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/coupons/${coupon.id}/edit`}>
                          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: coupon.id, code: coupon.code })}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Cupom"
        message={`Tem certeza que deseja excluir o cupom "${deleteTarget?.code}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
