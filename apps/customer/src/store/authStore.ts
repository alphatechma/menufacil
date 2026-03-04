import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '../services/api';
import type { Customer, CustomerAddress } from '../types';

interface AuthState {
  customer: Customer | null;
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
    (set, get) => {
      // Listen for unauthorized events to logout
      if (typeof window !== 'undefined') {
        window.addEventListener('unauthorized', () => {
          get().logout();
        });
      }

      return {
        customer: null,
        isAuthenticated: !!Cookies.get('customer_token'),
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
            
            // Set cookie for 7 days
            Cookies.set('customer_token', access_token, { expires: 7, path: '/' });
            
            set({
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
          Cookies.remove('customer_token', { path: '/' });
          set({
            customer: null,
            isAuthenticated: false,
            error: null,
          });
        },

        fetchProfile: async () => {
          try {
            const { data } = await api.get('/customers/me');
            set({ customer: data, isAuthenticated: true });
          } catch (err: any) {
            console.error('Error fetching profile:', err);
            if (err.response?.status === 401) {
              get().logout();
            }
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
      };
    },
    {
      name: 'menufacil-auth-v2', // Changed name to reset old localstorage
      partialize: (state) => ({
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
