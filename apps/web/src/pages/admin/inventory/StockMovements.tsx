import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Sliders } from 'lucide-react';
import { useGetStockMovementsQuery } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowDownCircle }> = {
  entry: { label: 'Entrada', color: 'text-green-600', icon: ArrowDownCircle },
  exit: { label: 'Saida', color: 'text-red-500', icon: ArrowUpCircle },
  adjustment: { label: 'Ajuste', color: 'text-blue-600', icon: Sliders },
  production: { label: 'Producao', color: 'text-amber-600', icon: RefreshCw },
};

export default function StockMovements() {
  const { data: movements = [] } = useGetStockMovementsQuery();

  return (
    <>
      <PageHeader title="Movimentacoes de Estoque" backTo="/admin/inventory" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Insumo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Quantidade</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custo Unit.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov: any) => {
                const config = TYPE_CONFIG[mov.type] || TYPE_CONFIG.entry;
                const Icon = config.icon;
                return (
                  <tr key={mov.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(mov.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{mov.item?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold', config.color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </td>
                    <td className={cn('px-4 py-3 text-right font-bold', config.color)}>
                      {mov.type === 'entry' ? '+' : mov.type === 'adjustment' ? '=' : '-'}{Number(mov.quantity).toFixed(1)} {mov.item?.unit || ''}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatPrice(mov.unit_cost)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{mov.reason || mov.reference || '-'}</td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma movimentacao registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
