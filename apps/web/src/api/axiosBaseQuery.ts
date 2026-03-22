import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { RootState } from '../store/index';
import { adminLogout } from '../store/slices/adminAuthSlice';

export type AuthContext = 'admin' | 'customer' | 'public';

interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  meta?: { authContext?: AuthContext; tenantSlug?: string };
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let refreshPromise: Promise<any> | null = null;

export const axiosBaseQuery: BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> = async (
  args,
  api,
) => {
  const { url, method = 'GET', data, params, headers = {}, meta } = args;
  const state = api.getState() as RootState;
  const authContext = meta?.authContext ?? 'public';

  // Set tenant slug header
  if (authContext === 'admin') {
    const { tenantSlug } = state.adminAuth;
    if (tenantSlug) {
      headers['X-Tenant-Slug'] = tenantSlug;
    }
    const { selectedUnitId } = state.ui;
    if (selectedUnitId) {
      headers['X-Unit-Id'] = selectedUnitId;
    }
    // Use Bearer token when impersonating (no cookies available)
    const impersonateToken = localStorage.getItem('menufacil-impersonate-token');
    if (impersonateToken) {
      headers['Authorization'] = `Bearer ${impersonateToken}`;
    }
  } else if (authContext === 'customer') {
    const slug = meta?.tenantSlug;
    if (slug) {
      headers['X-Tenant-Slug'] = slug;
    }
    headers['X-Auth-Context'] = 'customer';
    const customerUnitId = state.tenant?.selectedUnitId;
    if (customerUnitId) {
      headers['X-Unit-Id'] = customerUnitId;
    }
  }

  try {
    const result = await axiosInstance({ url, method, data, params, headers });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError;

    // Handle admin 401 with token refresh via cookie
    if (err.response?.status === 401 && authContext === 'admin') {
      try {
        // Deduplicate concurrent refresh attempts
        if (!refreshPromise) {
          refreshPromise = axiosInstance
            .post('/auth/refresh', {})
            .then((res) => res.data)
            .finally(() => {
              refreshPromise = null;
            });
        }

        await refreshPromise;

        // Retry original request (new cookies are set automatically)
        const retryResult = await axiosInstance({ url, method, data, params, headers });
        return { data: retryResult.data };
      } catch {
        refreshPromise = null;
        localStorage.removeItem('menufacil-impersonate-token');
        api.dispatch(adminLogout());
        window.location.href = '/login';
        return { error: { status: 401, data: 'Session expired' } };
      }
    }

    // Handle customer 401 — clear cookies via backend
    if (err.response?.status === 401 && authContext === 'customer') {
      try { await axiosInstance.post('/auth/logout'); } catch { /* ignore */ }
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
