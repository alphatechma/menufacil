import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import type { RootState } from '../store/index';
import { setAdminTokens, adminLogout } from '../store/slices/adminAuthSlice';

export type AuthContext = 'admin' | 'customer' | 'public';

interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  meta?: { authContext?: AuthContext; tenantSlug?: string };
}

const axiosInstance = axios.create({ baseURL: '/api' });

let isRefreshing = false;
let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

export const axiosBaseQuery: BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> = async (
  args,
  api,
) => {
  const { url, method = 'GET', data, params, headers = {}, meta } = args;
  const state = api.getState() as RootState;
  const authContext = meta?.authContext ?? 'public';

  // Set auth headers based on context
  if (authContext === 'admin') {
    const { accessToken, tenantSlug } = state.adminAuth;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (tenantSlug) {
      headers['X-Tenant-Slug'] = tenantSlug;
    }
  } else if (authContext === 'customer') {
    const token = Cookies.get('customer_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Tenant slug from meta or from URL
    const slug = meta?.tenantSlug;
    if (slug) {
      headers['X-Tenant-Slug'] = slug;
    }
  }

  try {
    const result = await axiosInstance({ url, method, data, params, headers });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError;

    // Handle admin 401 with token refresh
    if (err.response?.status === 401 && authContext === 'admin') {
      const { refreshToken } = state.adminAuth;
      if (refreshToken) {
        try {
          // Deduplicate concurrent refresh requests
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = axios
              .post('/api/auth/refresh', { refresh_token: refreshToken })
              .then((res) => res.data);
          }

          const tokens = await refreshPromise!;
          isRefreshing = false;
          refreshPromise = null;

          api.dispatch(setAdminTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }));

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${tokens.access_token}`;
          const retryResult = await axiosInstance({ url, method, data, params, headers });
          return { data: retryResult.data };
        } catch {
          isRefreshing = false;
          refreshPromise = null;
          api.dispatch(adminLogout());
          window.location.href = '/login';
          return { error: { status: 401, data: 'Session expired' } };
        }
      } else {
        api.dispatch(adminLogout());
        window.location.href = '/login';
      }
    }

    // Handle customer 401
    if (err.response?.status === 401 && authContext === 'customer') {
      Cookies.remove('customer_token', { path: '/' });
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    };
  }
};
