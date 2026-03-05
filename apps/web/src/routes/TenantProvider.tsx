import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTenant } from '@/store/slices/tenantSlice';
import { useGetPublicTenantQuery } from '@/api/customerApi';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { Spinner } from '@/components/ui/Spinner';

export function TenantProvider() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const tenant = useAppSelector((s) => s.tenant.tenant);

  const { data, isLoading, error } = useGetPublicTenantQuery(slug!, { skip: !slug });

  useEffect(() => {
    if (data) {
      dispatch(setTenant(data));
    }
  }, [data, dispatch]);

  useTenantBranding(tenant);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Loja nao encontrada</h2>
          <p className="text-gray-500">Verifique o endereco e tente novamente.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
