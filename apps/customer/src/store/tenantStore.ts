import { create } from 'zustand';
import api from '../services/api';
import type { Tenant, Category, Product } from '../types';

interface TenantState {
  tenant: Tenant | null;
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  error: string | null;

  fetchTenant: (slug: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProducts: (categoryId?: string) => Promise<void>;
  fetchProductById: (productId: string) => Promise<Product | null>;
  applyBranding: (tenant: Tenant) => void;
  hasModule: (key: string) => boolean;
}

export const useTenantStore = create<TenantState>()((set, get) => ({
  tenant: null,
  categories: [],
  products: [],
  isLoading: false,
  error: null,

  fetchTenant: async (slug: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<Tenant>(`/tenants/slug/${slug}`);
      set({ tenant: data, isLoading: false });
      get().applyBranding(data);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Loja nao encontrada',
        isLoading: false,
      });
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await api.get<Category[]>('/categories');
      set({ categories: data });
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  },

  fetchProducts: async (categoryId?: string) => {
    try {
      const params = categoryId ? { category_id: categoryId } : {};
      const { data } = await api.get<Product[]>('/products', { params });
      set({ products: data });
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  },

  fetchProductById: async (productId: string) => {
    try {
      const { data } = await api.get<Product>(`/products/${productId}`);
      return data;
    } catch (err) {
      console.error('Failed to fetch product', err);
      return null;
    }
  },

  hasModule: (key: string) => {
    const tenant = get().tenant;
    if (!tenant?.plan?.modules) return false;
    return tenant.plan.modules.some((m) => m.key === key);
  },

  applyBranding: (tenant: Tenant) => {
    const root = document.documentElement;
    const color = tenant.primary_color || '#FF6B35';

    root.style.setProperty('--tenant-primary', color);

    // Derive darker and lighter shades
    const darken = (hex: string, amount: number) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
      const b = Math.max(0, (num & 0x0000ff) - amount);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    const lighten = (hex: string, amount: number) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, (num >> 16) + amount);
      const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
      const b = Math.min(255, (num & 0x0000ff) + amount);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    root.style.setProperty('--tenant-primary-dark', darken(color, 20));
    root.style.setProperty('--tenant-primary-light', lighten(color, 40));
  },
}));
