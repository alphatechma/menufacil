import { useState } from 'react';
import {
  Crown,
  Heart,
  Sprout,
  AlertTriangle,
  UserX,
  ArrowLeft,
  Phone,
  Mail,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { useGetCustomerSegmentsQuery } from '@/api/adminApi';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';

type SegmentType = 'champions' | 'loyal' | 'promising' | 'at_risk' | 'lost';

const SEGMENT_CONFIG: Record<SegmentType, {
  label: string;
  description: string;
  icon: typeof Crown;
  bgColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  champions: {
    label: 'Campeoes',
    description: 'Compram frequentemente, valor alto',
    icon: Crown,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  loyal: {
    label: 'Leais',
    description: 'Clientes regulares',
    icon: Heart,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  promising: {
    label: 'Promissores',
    description: 'Novos e ativos',
    icon: Sprout,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
  },
  at_risk: {
    label: 'Em Risco',
    description: 'Diminuiram compras',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  lost: {
    label: 'Perdidos',
    description: 'Sem compras ha 60+ dias',
    icon: UserX,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
  },
};

export default function CustomerSegments() {
  const [selectedSegment, setSelectedSegment] = useState<SegmentType | null>(null);
  const { data, isLoading } = useGetCustomerSegmentsQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const segments = data?.segments;
  const totalCustomers = data?.total_customers || 0;

  const segmentKeys: SegmentType[] = ['champions', 'loyal', 'promising', 'at_risk', 'lost'];

  // Chart data
  const chartData = segmentKeys.map((key) => ({
    key,
    count: segments?.[key]?.count || 0,
    config: SEGMENT_CONFIG[key],
  }));
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div>
      <PageHeader
        title="Segmentacao de Clientes"
        description={`Analise RFM — ${totalCustomers} clientes`}
        backTo="/admin/customers"
      />

      {/* Segment cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {segmentKeys.map((key) => {
          const config = SEGMENT_CONFIG[key];
          const count = segments?.[key]?.count || 0;
          const Icon = config.icon;
          const isSelected = selectedSegment === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedSegment(isSelected ? null : key)}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95',
                isSelected
                  ? `${config.bgColor} ${config.borderColor}`
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                config.bgColor,
              )}>
                <Icon className={cn('w-5 h-5', config.textColor)} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className={cn('text-sm font-medium', config.textColor)}>
                {config.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
            </button>
          );
        })}
      </div>

      {/* Distribution bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Distribuição de Segmentos
        </h3>
        <div className="space-y-3">
          {chartData.map(({ key, count, config }) => {
            const percentage = totalCustomers > 0
              ? Math.round((count / totalCustomers) * 100)
              : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 shrink-0">
                  {config.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', config.dotColor)}
                    style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-16 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer list for selected segment */}
      {selectedSegment && segments?.[selectedSegment] && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                SEGMENT_CONFIG[selectedSegment].dotColor,
              )} />
              <h3 className="text-sm font-semibold text-gray-900">
                {SEGMENT_CONFIG[selectedSegment].label} — {segments[selectedSegment].count} clientes
              </h3>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Contato
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Último Pedido
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Pedidos (90d)
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Gasto (90d)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {segments[selectedSegment].customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </span>
                        {customer.email && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">
                        {customer.recency_days === 999
                          ? 'Nunca'
                          : `${customer.recency_days}d atras`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {customer.frequency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(customer.monetary)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {segments[selectedSegment].customers.map((customer: any) => (
              <div key={customer.id} className="p-4">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {customer.name}
                </p>
                <p className="text-xs text-gray-400 mb-2">{customer.phone}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">
                    Recencia: {customer.recency_days === 999 ? 'N/A' : `${customer.recency_days}d`}
                  </span>
                  <span className="text-gray-500">
                    Freq: {customer.frequency}
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatPrice(customer.monetary)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
