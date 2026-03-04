import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
}

export interface PlanInfo {
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
  plan: PlanInfo | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string, tenantSlug: string, modules?: string[], plan?: PlanInfo | null) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setTenantSlug: (slug: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      modules: [],
      plan: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken, tenantSlug, modules = [], plan = null) =>
        set({
          user,
          accessToken,
          refreshToken,
          tenantSlug,
          // Normalize modules: handle both string[] and object[] (legacy persisted data)
          modules: modules.map((m: any) => (typeof m === 'string' ? m : m.key)),
          plan,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          modules: [],
          plan: null,
          isAuthenticated: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setTenantSlug: (slug) =>
        set({ tenantSlug: slug }),

    }),
    {
      name: 'menufacil-admin-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        modules: state.modules,
        plan: state.plan,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persisted: any, version: number) => {
        if (version === 0 && persisted?.modules) {
          persisted.modules = persisted.modules.map((m: any) =>
            typeof m === 'string' ? m : m.key,
          );
        }
        return persisted;
      },
    },
  ),
);
