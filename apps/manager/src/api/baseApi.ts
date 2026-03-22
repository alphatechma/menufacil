import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Dashboard',
    'Tenants',
    'Plans',
    'SystemModules',
    'Permissions',
    'Profile',
  ],
  endpoints: () => ({}),
});
