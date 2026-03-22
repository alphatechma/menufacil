import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { RootState } from '../store';
import { logout, setTokens } from '../store/slices/authSlice';

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

const axiosInstance = axios.create({
  baseURL: '/api',
});

let refreshPromise: Promise<any> | null = null;

export const axiosBaseQuery: BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> = async (
  args,
  api,
) => {
  const { url, method = 'GET', data, params, headers = {} } = args;
  const state = api.getState() as RootState;
  const { accessToken } = state.auth;

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const result = await axiosInstance({ url, method, data, params, headers });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError;

    if (err.response?.status === 401) {
      const { refreshToken } = (api.getState() as RootState).auth;

      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axiosInstance
              .post('/auth/refresh', { refresh_token: refreshToken })
              .then((res) => res.data)
              .finally(() => {
                refreshPromise = null;
              });
          }

          const tokens = await refreshPromise;
          api.dispatch(setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }));

          headers['Authorization'] = `Bearer ${tokens.access_token}`;
          const retryResult = await axiosInstance({ url, method, data, params, headers });
          return { data: retryResult.data };
        } catch {
          refreshPromise = null;
          api.dispatch(logout());
          window.location.href = '/login';
          return { error: { status: 401, data: 'Session expired' } };
        }
      }

      api.dispatch(logout());
      window.location.href = '/login';
    }

    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    };
  }
};
