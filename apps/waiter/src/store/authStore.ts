import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface PlanInfo {
  id: string;
  name: string;
  price: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  modules: string[];
  permissions: string[];
  plan: PlanInfo | null;
  isAuthenticated: boolean;
  login: (data: {
    user: User;
    access_token: string;
    refresh_token: string;
    tenant_slug: string;
    modules?: string[];
    permissions?: string[];
    plan?: PlanInfo | null;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      modules: [],
      permissions: [],
      plan: null,
      isAuthenticated: false,
      login: (data) =>
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tenantSlug: data.tenant_slug,
          modules: (data.modules || []).map((m: any) => (typeof m === 'string' ? m : m.key)),
          permissions: data.permissions || [],
          plan: data.plan || null,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenantSlug: null,
          modules: [],
          permissions: [],
          plan: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'menufacil-waiter-auth', version: 1 },
  ),
);
