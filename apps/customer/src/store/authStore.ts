import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import type { Customer } from '../types';

interface AuthState {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (phone: string, name?: string) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  addAddress: (address: Omit<CustomerAddress, 'id' | 'is_default'>) => Promise<boolean>;
  removeAddress: (addressId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone, name) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/customer/login', {
            phone,
            name,
          });
          const { access_token, customer } = data;
          localStorage.setItem('customer_token', access_token);
          set({
            token: access_token,
            customer,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err: any) {
          set({
            error: err.response?.data?.message || 'Erro ao fazer login',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('customer_token');
        set({
          customer: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchProfile: async () => {
        try {
          const { data } = await api.get('/customers/me');
          set({ customer: data });
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      },

      addAddress: async (address) => {
        try {
          await api.post('/customers/me/addresses', address);
          await get().fetchProfile();
          return true;
        } catch (err: any) {
          set({ error: err.response?.data?.message || 'Erro ao adicionar endereco' });
          return false;
        }
      },

      removeAddress: async (addressId) => {
        try {
          await api.delete(`/customers/me/addresses/${addressId}`);
          await get().fetchProfile();
          return true;
        } catch (err: any) {
          set({ error: err.response?.data?.message || 'Erro ao remover endereco' });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'menufacil-auth',
      partialize: (state) => ({
        token: state.token,
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
