import { useState } from 'react';
import { Trophy, Truck, Clock, Star } from 'lucide-react';
import { useGetDeliveryScoreboardQuery } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';

const rankColors: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Ouro' },
  1: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Prata' },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Bronze' },
};

export default function DeliveryScoreboard() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);

  const { data: scoreboard = [], isLoading } = useGetDeliveryScoreboardQuery({
    from: dateFrom,
    to: dateTo,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking de Entregadores"
        description="Performance dos entregadores no período selecionado"
      />

      {/* Date filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">De:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Ate:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      ) : scoreboard.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-12 h-12 text-gray-300" />}
          title="Nenhum entregador encontrado"
          description="Cadastre entregadores para ver o ranking."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Scoreboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-medium text-gray-500 w-12">#</th>
                    <th className="pb-3 font-medium text-gray-500">Entregador</th>
                    <th className="pb-3 font-medium text-gray-500 text-center">Entregas</th>
                    <th className="pb-3 font-medium text-gray-500 text-center">Tempo Médio</th>
                    <th className="pb-3 font-medium text-gray-500 text-center">Taxa Conclusao</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Comissao</th>
                    <th className="pb-3 font-medium text-gray-500 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((person, index) => {
                    const rankStyle = rankColors[index];
                    return (
                      <tr
                        key={person.id}
                        className={cn(
                          'border-b border-gray-50 transition-colors',
                          index < 3 && 'bg-gray-50/50',
                        )}
                      >
                        <td className="py-3">
                          {rankStyle ? (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                                rankStyle.bg,
                                rankStyle.text,
                              )}
                            >
                              {index + 1}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 text-gray-400 text-sm">
                              {index + 1}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-gray-900">{person.name}</p>
                              <p className="text-xs text-gray-400">
                                {person.vehicle || 'Sem veiculo'} {!person.is_active && '(Inativo)'}
                              </p>
                            </div>
                            {rankStyle && (
                              <Badge variant={index === 0 ? 'warning' : 'default'}>
                                {rankStyle.label}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-gray-900">{person.total_deliveries}</span>
                            <span className="text-xs text-gray-400">de {person.total_assigned}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-700">
                              {person.avg_delivery_time > 0 ? `${person.avg_delivery_time} min` : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant={
                              person.completion_rate >= 90
                                ? 'success'
                                : person.completion_rate >= 70
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {person.completion_rate}%
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium text-gray-700">
                          {formatPrice(person.total_commission)}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-primary" />
                            <span className="font-bold text-primary">{person.score}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
