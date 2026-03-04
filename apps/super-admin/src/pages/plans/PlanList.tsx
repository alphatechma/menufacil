import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import api from '../../services/api';

export default function PlanList() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/super-admin/plans');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
        <Link
          to="/plans/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map((plan: any) => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <Link
                  to={`/plans/${plan.id}/edit`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>

              <p className="text-3xl font-bold text-primary">
                R$ {Number(plan.price).toFixed(2)}
                <span className="text-sm font-normal text-gray-400">/mes</span>
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Max Usuarios</span>
                  <span className="font-medium">{plan.max_users ?? 'Ilimitado'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Max Produtos</span>
                  <span className="font-medium">{plan.max_products ?? 'Ilimitado'}</span>
                </div>
              </div>

              {plan.modules?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Modulos:</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.modules.map((mod: any) => (
                      <span key={mod.id} className="inline-flex px-2 py-0.5 rounded-md text-xs bg-primary-50 text-primary">
                        {mod.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  plan.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
