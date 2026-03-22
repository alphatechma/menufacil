import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Dashboard',
    'Tenants',
    'Plans',
    'SystemModules',
    'Permissions',
    'Profile',
    'AuditLogs',
  ],
  endpoints: () => ({}),
});
