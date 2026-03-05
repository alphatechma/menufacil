import { useAppSelector } from '@/store/hooks';

export function useCustomerAuth() {
  const { customer, isAuthenticated, isLoading, error } = useAppSelector((s) => s.customerAuth);
  return { customer, isAuthenticated, isLoading, error };
}
