import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const { accessToken, tenantSlug } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, logout, login } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = api.post('/auth/refresh', { refresh_token: refreshToken });
        }

        const res = await refreshPromise!;
        isRefreshing = false;
        refreshPromise = null;

        const state = useAuthStore.getState();
        login({
          user: state.user!,
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
          tenant_slug: state.tenantSlug!,
          modules: state.modules,
          permissions: state.permissions,
          plan: state.plan,
        });

        error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
        return api(error.config);
      } catch {
        isRefreshing = false;
        refreshPromise = null;
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
