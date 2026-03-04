import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Ticket,
  Tag,
  Percent,
  Clock,
} from 'lucide-react';
import api from '../../services/api';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  tenant_id: string;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'expired';

export default function CouponList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await api.get('/coupons');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setDeleteId(null);
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDiscountValue = (coupon: Coupon) => {
    if (coupon.discount_type === 'percent') {
      return `${coupon.discount_value}%`;
    }
    return formatPrice(coupon.discount_value);
  };

  const getCouponStatus = (coupon: Coupon): 'active' | 'expired' | 'exhausted' => {
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return 'exhausted';
    }
    if (new Date(coupon.valid_until) < new Date()) {
      return 'expired';
    }
    return 'active';
  };

  const getStatusBadge = (status: 'active' | 'expired' | 'exhausted') => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          className: 'bg-green-100 text-green-700',
        };
      case 'expired':
        return {
          label: 'Expirado',
          className: 'bg-red-100 text-red-700',
        };
      case 'exhausted':
        return {
          label: 'Esgotado',
          className: 'bg-gray-100 text-gray-600',
        };
    }
  };

  const filtered = coupons.filter((coupon) => {
    const matchesSearch = coupon.code.toLowerCase().includes(search.toLowerCase());

    const now = new Date();
    const validUntil = new Date(coupon.valid_until);
    let matchesFilter = true;

    if (filter === 'active') {
      matchesFilter = validUntil > now;
    } else if (filter === 'expired') {
      matchesFilter = validUntil < now;
    }

    return matchesSearch && matchesFilter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'expired', label: 'Expirados' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="text-gray-500 mt-1">Gerencie os cupons de desconto</p>
        </div>
        <Link
          to="/coupons/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Cupom
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por codigo do cupom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Ticket className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum cupom encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro cupom de desconto para comecar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codigo
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Tipo de Desconto
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Pedido Minimo
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Uso
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Validade
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  const badge = getStatusBadge(status);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-gray-900 font-mono">
                            {coupon.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          {coupon.discount_type === 'percent' ? (
                            <Percent className="w-4 h-4 text-gray-400" />
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">R$</span>
                          )}
                          {coupon.discount_type === 'percent' ? 'Percentual' : 'Valor Fixo'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                        {formatDiscountValue(coupon)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden lg:table-cell">
                        {coupon.min_order ? formatPrice(coupon.min_order) : '--'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-center text-gray-600 hidden sm:table-cell">
                        {coupon.current_uses}/{coupon.max_uses ?? '\u221E'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/coupons/${coupon.id}/edit`}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(coupon.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900">Excluir Cupom</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Tem certeza que deseja excluir este cupom? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
