import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from '../store/index';
import { adminLogout } from '../store/slices/adminAuthSlice';
import { env } from '@/config/env';

export type AuthContext = 'admin' | 'customer' | 'public';

interface ExtraMeta {
  authContext?: AuthContext;
  tenantSlug?: string;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as RootState;

    // Determine auth context from endpoint metadata
    // This is set per-endpoint via extraOptions or meta
    const meta = (endpoint as any)?._meta as ExtraMeta | undefined;
    const authContext = meta?.authContext ?? 'public';

    if (authContext === 'admin') {
      const { tenantSlug } = state.adminAuth;
      if (tenantSlug) headers.set('X-Tenant-Slug', tenantSlug);

      const { selectedUnitId } = state.ui;
      if (selectedUnitId) headers.set('X-Unit-Id', selectedUnitId);

      const impersonateToken = localStorage.getItem('menufacil-impersonate-token');
      if (impersonateToken) headers.set('Authorization', `Bearer ${impersonateToken}`);
    } else if (authContext === 'customer') {
      const slug = meta?.tenantSlug;
      if (slug) headers.set('X-Tenant-Slug', slug);
      headers.set('X-Auth-Context', 'customer');

      const customerUnitId = state.tenant?.selectedUnitId;
      if (customerUnitId) headers.set('X-Unit-Id', customerUnitId);
    }

    return headers;
  },
});

let refreshPromise: Promise<any> | null = null;

export const axiosBaseQuery: BaseQueryFn<
  string | (FetchArgs & { meta?: ExtraMeta }),
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Normalize args and extract meta
  let fetchArgs: FetchArgs;
  let meta: ExtraMeta | undefined;

  if (typeof args === 'string') {
    fetchArgs = { url: args };
  } else {
    const { meta: argsMeta, data, ...rest } = args as FetchArgs & { meta?: ExtraMeta; data?: unknown };
    fetchArgs = { ...rest, body: data ?? (rest as FetchArgs).body };
    meta = argsMeta;
  }

  // Attach meta to endpoint for prepareHeaders
  if (meta) {
    (api as any).endpoint = { ...(api as any).endpoint, _meta: meta };
  }

  // Build headers from meta (since prepareHeaders can't access per-call meta easily)
  const state = api.getState() as RootState;
  const authContext = meta?.authContext ?? 'public';
  const headers: Record<string, string> = {};

  if (authContext === 'admin') {
    const { tenantSlug } = state.adminAuth;
    if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;
    const { selectedUnitId } = state.ui;
    if (selectedUnitId) headers['X-Unit-Id'] = selectedUnitId;
    const impersonateToken = localStorage.getItem('menufacil-impersonate-token');
    if (impersonateToken) headers['Authorization'] = `Bearer ${impersonateToken}`;
  } else if (authContext === 'customer') {
    const slug = meta?.tenantSlug;
    if (slug) headers['X-Tenant-Slug'] = slug;
    headers['X-Auth-Context'] = 'customer';
    const customerUnitId = state.tenant?.selectedUnitId;
    if (customerUnitId) headers['X-Unit-Id'] = customerUnitId;
  }

  // Merge headers
  fetchArgs.headers = { ...headers, ...(fetchArgs.headers as Record<string, string>) };

  let result = await rawBaseQuery(fetchArgs, api, extraOptions);

  // Handle network/connection errors
  if (result.error && result.error.status === 'FETCH_ERROR') {
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: { type: 'network', message: 'Não foi possível conectar ao servidor. Verifique sua conexão.' },
    }));
  } else if (result.error && result.error.status === 'TIMEOUT_ERROR') {
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: { type: 'timeout', message: 'O servidor demorou para responder. Tente novamente.' },
    }));
  } else if (result.error && typeof result.error.status === 'number' && result.error.status >= 500) {
    const msg = (result.error.data as any)?.message || 'Erro interno do servidor. Tente novamente.';
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: { type: 'server', message: msg },
    }));
  }

  // Handle admin 401 with token refresh via cookie
  if (result.error?.status === 401 && authContext === 'admin') {
    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const res = await rawBaseQuery(
            { url: '/auth/refresh', method: 'POST', body: {} },
            api,
            extraOptions,
          );
          if (res.error) throw res.error;
          return res.data;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // Retry original request
      result = await rawBaseQuery(fetchArgs, api, extraOptions);
    } catch {
      refreshPromise = null;
      localStorage.removeItem('menufacil-impersonate-token');
      api.dispatch(adminLogout());
      window.location.href = '/login';
      return { error: { status: 401 as const, data: 'Session expired' } };
    }
  }

  // Handle customer 401
  if (result.error?.status === 401 && authContext === 'customer') {
    try {
      await rawBaseQuery({ url: '/auth/logout', method: 'POST' }, api, extraOptions);
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('unauthorized'));
  }

  return result;
};
