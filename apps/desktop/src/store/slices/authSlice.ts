import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DesktopUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
  role_id?: string | null;
}

interface AuthState {
  user: DesktopUser | null;
  tenantSlug: string | null;
  token: string | null;
  refreshToken: string | null;
  modules: string[];
  permissions: string[];
  plan: any;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'menufacil-desktop-auth';

function loadFromStorage(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const persisted = loadFromStorage();

const initialState: AuthState = {
  user: persisted.user ?? null,
  tenantSlug: persisted.tenantSlug ?? null,
  token: persisted.token ?? null,
  refreshToken: persisted.refreshToken ?? null,
  modules: (persisted as any).modules ?? [],
  permissions: (persisted as any).permissions ?? [],
  plan: (persisted as any).plan ?? null,
  isAuthenticated: persisted.isAuthenticated ?? false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{
        user: DesktopUser;
        token: string;
        refreshToken?: string | null;
        tenantSlug: string;
        modules?: string[];
        permissions?: string[];
        plan?: any;
      }>,
    ) {
      const { user, token, refreshToken, tenantSlug, modules, permissions, plan } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken ?? null;
      state.tenantSlug = tenantSlug;
      state.modules = modules || [];
      state.permissions = permissions || [];
      state.plan = plan || null;
      state.isAuthenticated = true;
    },
    tokensRefreshed(
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>,
    ) {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tenantSlug = null;
      state.modules = [];
      state.permissions = [];
      state.plan = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, tokensRefreshed, logout } = authSlice.actions;
export default authSlice.reducer;
