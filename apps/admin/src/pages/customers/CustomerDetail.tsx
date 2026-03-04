import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  Award,
  MapPin,
  Star,
  Clock,
  Users,
  ShoppingBag,
} from 'lucide-react';
import api from '../../services/api';

interface Address {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  is_default: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number;
  created_at: string;
  tenant_id: string;
  addresses?: Address[];
  orders?: {
    id: string;
    total: number;
    status: string;
    created_at: string;
  }[];
}

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-cyan-500',
  'bg-amber-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <Users className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-lg font-medium">Cliente nao encontrado</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista
        </button>
      </div>
    );
  }

  const totalOrders = customer.orders?.length ?? 0;
  const totalSpent = customer.orders?.reduce((sum, order) => sum + Number(order.total), 0) ?? 0;
  const lastOrder = customer.orders?.length
    ? customer.orders.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h1>
          <p className="text-gray-500 mt-1">Informacoes completas do cliente</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full ${getAvatarColor(customer.name)} flex items-center justify-center shrink-0`}
          >
            <span className="text-2xl font-bold text-white">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
              {customer.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {customer.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                Cliente desde {formatDate(customer.created_at)}
              </span>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
              <Award className="w-4 h-4" />
              {customer.loyalty_points ?? 0} pontos
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Pedidos</p>
              <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Gasto</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ultimo Pedido</p>
              <p className="text-xl font-bold text-gray-900">
                {lastOrder ? formatDate(lastOrder.created_at) : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            Enderecos
          </h3>
        </div>
        <div className="p-5">
          {!customer.addresses || customer.addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum endereco cadastrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customer.addresses.map((address) => (
                <div
                  key={address.id}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {address.street}, {address.number}
                        {address.complement ? ` - ${address.complement}` : ''}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {address.neighborhood} - {address.city}/{address.state}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">CEP: {address.zipcode}</p>
                    </div>
                    {address.is_default && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary shrink-0">
                        <Star className="w-3 h-3" />
                        Padrao
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order History Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            Historico de Pedidos
          </h3>
        </div>
        <div className="p-5">
          {!customer.orders || customer.orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum pedido encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                O historico de pedidos aparecera aqui
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatPrice(Number(order.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
