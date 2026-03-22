import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RootState } from '../store';
import { logout, setTokens } from '../store/slices/authSlice';
import { env } from '../config/env';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const { accessToken } = (getState() as RootState).auth;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return headers;
  },
});

let refreshPromise: Promise<any> | null = null;

export const baseQuery: BaseQueryFn<
  string | (FetchArgs & { data?: unknown }),
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Normalize: the existing codebase uses `data` instead of `body`
  let fetchArgs: string | FetchArgs;
  if (typeof args === 'string') {
    fetchArgs = args;
  } else {
    const { data, ...rest } = args as FetchArgs & { data?: unknown };
    fetchArgs = { ...rest, body: data ?? (rest as FetchArgs).body };
  }

  let result = await rawBaseQuery(fetchArgs, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const { refreshToken } = (api.getState() as RootState).auth;

    if (refreshToken) {
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshResult = await rawBaseQuery(
              {
                url: '/auth/refresh',
                method: 'POST',
                body: { refresh_token: refreshToken },
              },
              api,
              extraOptions,
            );

            if (refreshResult.error) {
              throw refreshResult.error;
            }

            return refreshResult.data;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const tokens = (await refreshPromise) as {
          access_token: string;
          refresh_token: string;
        };

        api.dispatch(
          setTokens({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          }),
        );

        // Retry original request with new token
        result = await rawBaseQuery(fetchArgs, api, extraOptions);
      } catch {
        refreshPromise = null;
        api.dispatch(logout());
        window.location.href = '/login';
        return { error: { status: 401, data: 'Session expired' } as FetchBaseQueryError };
      }
    } else {
      api.dispatch(logout());
      window.location.href = '/login';
    }
  }

  return result;
};
