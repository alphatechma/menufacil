import { AlertTriangle, Package, TrendingDown, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetReorderSuggestionsQuery } from '@/api/adminApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';

export default function LowStockAlerts() {
  const navigate = useNavigate();
  const { data: suggestions = [], isLoading } = useGetReorderSuggestionsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de Estoque Baixo"
        subtitle={`${suggestions.length} item(ns) abaixo do estoque mínimo`}
        onBack={() => navigate('/admin/inventory')}
      />

      {suggestions.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12 text-gray-300" />}
          title="Estoque em dia!"
          description="Nenhum item abaixo do estoque mínimo."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Itens Criticos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {suggestions.filter((s) => s.current_stock === 0).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estoque Baixo</p>
                  <p className="text-lg font-bold text-gray-900">{suggestions.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custo Reposicao</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(suggestions.reduce((sum, s) => sum + s.estimated_cost, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sugestoes de Reposicao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-3 font-medium text-gray-500">Item</th>
                      <th className="pb-3 font-medium text-gray-500 text-center">Qtd Atual</th>
                      <th className="pb-3 font-medium text-gray-500 text-center">Mínimo</th>
                      <th className="pb-3 font-medium text-gray-500 text-center">Deficit</th>
                      <th className="pb-3 font-medium text-gray-500 text-center">Consumo/Dia</th>
                      <th className="pb-3 font-medium text-gray-500 text-center">Sugestao (7d)</th>
                      <th className="pb-3 font-medium text-gray-500 text-right">Custo Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/inventory/${item.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                item.current_stock === 0 ? 'bg-red-500' : 'bg-orange-400',
                              )}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-400">
                                {item.sku ? `${item.sku} - ` : ''}{item.category || 'Sem categoria'}
                                {item.supplier ? ` | ${item.supplier}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={item.current_stock === 0 ? 'danger' : 'warning'}>
                            {item.current_stock} {item.unit}
                          </Badge>
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {item.min_stock} {item.unit}
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-medium text-red-600">
                            -{item.deficit} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {item.avg_daily_consumption} {item.unit}
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-primary">
                            {item.suggested_reorder} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-700">
                          {formatPrice(item.estimated_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
