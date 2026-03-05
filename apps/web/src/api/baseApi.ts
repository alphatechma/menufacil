import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  tagTypes: [
    'Categories',
    'Products',
    'Orders',
    'Customers',
    'DeliveryZones',
    'Coupons',
    'Loyalty',
    'Tenant',
    'TenantPublic',
    'Settings',
    'Dashboard',
    'Profile',
    'Plan',
    'CustomerProfile',
    'CustomerOrders',
  ],
  endpoints: () => ({}),
});
