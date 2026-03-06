import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
  role_id?: string | null;
}

export interface PlanInfo {
  id: string;
  name: string;
  price: number;
}

interface AdminAuthState {
  user: AdminUser | null;
  tenantSlug: string | null;
  modules: string[];
  permissions: string[];
  plan: PlanInfo | null;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'menufacil-admin-auth';

function loadFromStorage(): Partial<AdminAuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (data.modules) {
      data.modules = data.modules.map((m: unknown) =>
        typeof m === 'string' ? m : (m as { key: string }).key,
      );
    }
    return data;
  } catch {
    return {};
  }
}

const persisted = loadFromStorage();

const initialState: AdminAuthState = {
  user: persisted.user ?? null,
  tenantSlug: persisted.tenantSlug ?? null,
  modules: persisted.modules ?? [],
  permissions: persisted.permissions ?? [],
  plan: persisted.plan ?? null,
  isAuthenticated: persisted.isAuthenticated ?? false,
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminLogin(
      state,
      action: PayloadAction<{
        user: AdminUser;
        tenantSlug: string;
        modules?: string[];
        permissions?: string[];
        plan?: PlanInfo | null;
      }>,
    ) {
      const { user, tenantSlug, modules = [], permissions = [], plan = null } = action.payload;
      state.user = user;
      state.tenantSlug = tenantSlug;
      state.modules = modules.map((m: unknown) => (typeof m === 'string' ? m : (m as { key: string }).key));
      state.permissions = permissions;
      state.plan = plan;
      state.isAuthenticated = true;
    },
    adminLogout(state) {
      state.user = null;
      state.modules = [];
      state.permissions = [];
      state.plan = null;
      state.isAuthenticated = false;
    },
    setTenantSlug(state, action: PayloadAction<string>) {
      state.tenantSlug = action.payload;
    },
  },
});

export const { adminLogin, adminLogout, setTenantSlug } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
