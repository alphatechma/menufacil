import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdminUser {
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

interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  modules: string[];
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
  accessToken: persisted.accessToken ?? null,
  refreshToken: persisted.refreshToken ?? null,
  tenantSlug: persisted.tenantSlug ?? null,
  modules: persisted.modules ?? [],
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
        accessToken: string;
        refreshToken: string;
        tenantSlug: string;
        modules?: string[];
        plan?: PlanInfo | null;
      }>,
    ) {
      const { user, accessToken, refreshToken, tenantSlug, modules = [], plan = null } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.tenantSlug = tenantSlug;
      state.modules = modules.map((m: unknown) => (typeof m === 'string' ? m : (m as { key: string }).key));
      state.plan = plan;
      state.isAuthenticated = true;
    },
    adminLogout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.modules = [];
      state.plan = null;
      state.isAuthenticated = false;
    },
    setAdminTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setTenantSlug(state, action: PayloadAction<string>) {
      state.tenantSlug = action.payload;
    },
  },
});

export const { adminLogin, adminLogout, setAdminTokens, setTenantSlug } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
