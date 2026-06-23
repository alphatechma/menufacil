import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';
import { logout, tokensRefreshed } from '@/store/slices/authSlice';
import { env } from '@/config/env';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const { token, tenantSlug } = state.auth;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (tenantSlug) {
      headers.set('X-Tenant-Slug', tenantSlug);
    }

    return headers;
  },
});

// Dedup de refresh concorrente: várias queries que recebem 401 ao mesmo tempo compartilham
// uma única chamada a /auth/refresh.
let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

// Wrapper de reauth (espelha apps/web/src/api/axiosBaseQuery.ts, adaptado ao modelo do desktop:
// token Bearer no Redux/localStorage; refresh_token enviado no body, não em cookie).
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Limpa a sessão e devolve o 401. O AuthGuard reativo (App.tsx) redireciona para /login.
    const logoutAndReturn = () => {
      refreshPromise = null;
      api.dispatch(logout());
      return result;
    };

    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) return logoutAndReturn();

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const res = await rawBaseQuery(
            { url: '/auth/refresh', method: 'POST', body: { refresh_token: refreshToken } },
            api,
            extraOptions,
          );
          if (res.error) throw res.error;
          return res.data as { access_token: string; refresh_token: string };
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const tokens = await refreshPromise;
      api.dispatch(tokensRefreshed(tokens));

      // Refaz a requisição original já com o token renovado.
      result = await rawBaseQuery(args, api, extraOptions);

      // Refresh funcionou, mas o recurso ainda rejeita → sessão não é mais válida.
      if (result.error?.status === 401) return logoutAndReturn();
    } catch {
      return logoutAndReturn();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Orders',
    'Products',
    'Categories',
    'Customers',
    'Tenant',
    'CashRegister',
    'Inventory',
    'Tables',
    'Dashboard',
    'DeliveryPersons',
    'ExtraGroups',
    'Coupons',
    'DeliveryZones',
    'Reservations',
    'FloorPlans',
    'Staff',
    'Roles',
    'Loyalty',
    'Units',
    'Analytics',
  ],
  endpoints: () => ({}),
});
