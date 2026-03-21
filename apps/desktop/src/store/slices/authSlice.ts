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
        tenantSlug: string;
      }>,
    ) {
      const { user, token, tenantSlug } = action.payload;
      state.user = user;
      state.token = token;
      state.tenantSlug = tenantSlug;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.tenantSlug = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
