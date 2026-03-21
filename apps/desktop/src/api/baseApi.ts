import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: localStorage.getItem('desktop_api_url') || 'https://menufacil-api.mp1rvc.easypanel.host/api',
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
  }),
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
  ],
  endpoints: () => ({}),
});
