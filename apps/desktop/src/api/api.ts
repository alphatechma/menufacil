import { baseApi } from './baseApi';

export const api = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Auth
    adminLogin: builder.mutation<
      { user: any; access_token: string; refresh_token: string; modules: string[]; permissions: string[]; plan: any; tenant_slug: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/admin/login', method: 'POST', body }),
    }),

    // Products
    getProducts: builder.query<any[], void>({
      query: () => ({ url: '/products/all' }),
      providesTags: ['Products'],
    }),

    // Categories
    getCategories: builder.query<any[], void>({
      query: () => ({ url: '/categories/all' }),
      providesTags: ['Categories'],
    }),

    // Customers
    getCustomers: builder.query<any[], void>({
      query: () => ({ url: '/customers' }),
      providesTags: ['Customers'],
    }),

    // Tenant
    getTenantBySlug: builder.query<any, string>({
      query: (slug) => ({ url: `/tenants/slug/${slug}` }),
      providesTags: ['Tenant'],
    }),

    // Orders
    getOrders: builder.query<any[], void>({
      query: () => ({ url: '/orders' }),
      providesTags: ['Orders'],
    }),

    updateOrderStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/status`, method: 'PUT', body }),
      invalidatesTags: ['Orders', 'Dashboard'],
    }),

    createAdminOrder: builder.mutation<any, any>({
      query: (data) => ({ url: '/orders/admin', method: 'POST', body: data }),
      invalidatesTags: ['Orders', 'Dashboard', 'CashRegister'],
    }),

    // Cash Register
    getCashRegister: builder.query<any, void>({
      query: () => ({ url: '/orders/cash-register/current' }),
      providesTags: ['CashRegister'],
    }),

    openCashRegister: builder.mutation<any, { opening_balance: number }>({
      query: (data) => ({ url: '/orders/cash-register/open', method: 'POST', body: data }),
      invalidatesTags: ['CashRegister'],
    }),

    closeCashRegister: builder.mutation<any, { closing_balance: number; notes?: string }>({
      query: (data) => ({ url: '/orders/cash-register/close', method: 'POST', body: data }),
      invalidatesTags: ['CashRegister'],
    }),

    // Tables
    getTables: builder.query<any[], void>({
      query: () => ({ url: '/tables' }),
      providesTags: ['Tables'],
    }),

    // Create Customer
    createCustomer: builder.mutation<any, { name: string; phone: string; email?: string }>({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customers'],
    }),

    // Tenant update
    updateTenant: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/tenants/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Tenant'],
    }),

    // Delivery Persons
    getDeliveryPersons: builder.query<any[], void>({
      query: () => ({ url: '/delivery-persons' }),
      providesTags: ['DeliveryPersons'],
    }),

    assignDeliveryPerson: builder.mutation<void, { id: string; delivery_person_id: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/delivery-person`, method: 'PUT', body }),
      invalidatesTags: ['Orders'],
    }),

    // Product update
    updateProduct: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/products/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Products'],
    }),

    // WhatsApp
    getWhatsappStatus: builder.query<any, void>({
      query: () => ({ url: '/whatsapp/instance/status' }),
    }),
    connectWhatsapp: builder.mutation<any, void>({
      query: () => ({ url: '/whatsapp/instance/connect', method: 'POST' }),
    }),
    disconnectWhatsapp: builder.mutation<any, void>({
      query: () => ({ url: '/whatsapp/instance/disconnect', method: 'POST' }),
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetCustomersQuery,
  useGetTenantBySlugQuery,
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useCreateAdminOrderMutation,
  useGetCashRegisterQuery,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
  useGetTablesQuery,
  useCreateCustomerMutation,
  useUpdateTenantMutation,
  useGetWhatsappStatusQuery,
  useConnectWhatsappMutation,
  useDisconnectWhatsappMutation,
  useGetDeliveryPersonsQuery,
  useAssignDeliveryPersonMutation,
  useUpdateProductMutation,
} = api;
