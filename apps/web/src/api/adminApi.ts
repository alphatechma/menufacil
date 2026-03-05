import { baseApi } from './baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Auth
    adminLogin: builder.mutation<
      { user: any; access_token: string; refresh_token: string; modules: string[]; plan: any; tenant_slug: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/admin/login', method: 'POST', data: body, meta: { authContext: 'public' as const } }),
    }),

    // Profile
    getProfile: builder.query<any, void>({
      query: () => ({ url: '/users/me', meta: { authContext: 'admin' as const } }),
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<void, { id: string; name: string }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Profile'],
    }),
    changePassword: builder.mutation<void, { current_password: string; new_password: string }>({
      query: (body) => ({ url: '/users/me/password', method: 'PUT', data: body, meta: { authContext: 'admin' as const } }),
    }),

    // Plans
    getPublicPlans: builder.query<any[], void>({
      query: () => ({ url: '/plans/public', meta: { authContext: 'admin' as const } }),
      providesTags: ['Plan'],
    }),

    // Dashboard (no API - mock data currently)

    // Categories
    getCategories: builder.query<any[], void>({
      query: () => ({ url: '/categories/all', meta: { authContext: 'admin' as const } }),
      providesTags: ['Categories'],
    }),
    getCategory: builder.query<any, string>({
      query: (id) => ({ url: `/categories/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Categories', id }],
    }),
    createCategory: builder.mutation<void, any>({
      query: (body) => ({ url: '/categories', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/categories/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Categories'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/categories/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Categories'],
    }),

    // Products
    getProducts: builder.query<any[], void>({
      query: () => ({ url: '/products/all', meta: { authContext: 'admin' as const } }),
      providesTags: ['Products'],
    }),
    getProduct: builder.query<any, string>({
      query: (id) => ({ url: `/products/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Products', id }],
    }),
    createProduct: builder.mutation<void, any>({
      query: (body) => ({ url: '/products', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/products/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Products'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Products'],
    }),
    reorderProducts: builder.mutation<void, { items: { id: string; sort_order: number }[] }>({
      query: (body) => ({ url: '/products/reorder', method: 'PUT', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Products'],
    }),
    getExtraGroups: builder.query<any[], void>({
      query: () => ({ url: '/extra-groups', meta: { authContext: 'admin' as const } }),
    }),

    // Orders
    getOrders: builder.query<any[], void>({
      query: () => ({ url: '/orders', meta: { authContext: 'admin' as const } }),
      providesTags: ['Orders'],
    }),
    getOrder: builder.query<any, string>({
      query: (id) => ({ url: `/orders/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Orders', id }],
    }),
    updateOrderStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/orders/${id}/status`, method: 'PUT', data: { status }, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Orders'],
    }),

    // Customers
    getCustomers: builder.query<any[], void>({
      query: () => ({ url: '/customers', meta: { authContext: 'admin' as const } }),
      providesTags: ['Customers'],
    }),
    getCustomer: builder.query<any, string>({
      query: (id) => ({ url: `/customers/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Customers', id }],
    }),
    createCustomer: builder.mutation<any, { name: string; phone: string; email?: string }>({
      query: (body) => ({ url: '/customers', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Customers'],
    }),

    // Delivery Zones
    getDeliveryZones: builder.query<any[], void>({
      query: () => ({ url: '/delivery-zones', meta: { authContext: 'admin' as const } }),
      providesTags: ['DeliveryZones'],
    }),
    getDeliveryZone: builder.query<any, string>({
      query: (id) => ({ url: `/delivery-zones/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'DeliveryZones', id }],
    }),
    createDeliveryZone: builder.mutation<void, any>({
      query: (body) => ({ url: '/delivery-zones', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryZones'],
    }),
    updateDeliveryZone: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/delivery-zones/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryZones'],
    }),
    deleteDeliveryZone: builder.mutation<void, string>({
      query: (id) => ({ url: `/delivery-zones/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryZones'],
    }),

    // Coupons
    getCoupons: builder.query<any[], void>({
      query: () => ({ url: '/coupons', meta: { authContext: 'admin' as const } }),
      providesTags: ['Coupons'],
    }),
    getCoupon: builder.query<any, string>({
      query: (id) => ({ url: `/coupons/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Coupons', id }],
    }),
    createCoupon: builder.mutation<void, any>({
      query: (body) => ({ url: '/coupons', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Coupons'],
    }),
    updateCoupon: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/coupons/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Coupons'],
    }),
    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({ url: `/coupons/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Coupons'],
    }),

    // Loyalty
    getLoyaltyRewards: builder.query<any[], void>({
      query: () => ({ url: '/loyalty/rewards', meta: { authContext: 'admin' as const } }),
      providesTags: ['Loyalty'],
    }),
    createLoyaltyReward: builder.mutation<void, any>({
      query: (body) => ({ url: '/loyalty/rewards', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Loyalty'],
    }),
    deleteLoyaltyReward: builder.mutation<void, string>({
      query: (id) => ({ url: `/loyalty/rewards/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Loyalty'],
    }),

    // Tenant Settings
    getTenantBySlug: builder.query<any, string>({
      query: (slug) => ({ url: `/tenants/slug/${slug}`, meta: { authContext: 'admin' as const } }),
      providesTags: ['Settings'],
    }),
    updateTenant: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/tenants/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Settings'],
    }),

    // Upload
    uploadImage: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/upload/image',
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        meta: { authContext: 'admin' as const },
      }),
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetPublicPlansQuery,
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useReorderProductsMutation,
  useGetExtraGroupsQuery,
  useGetOrdersQuery,
  useGetOrderQuery,
  useUpdateOrderStatusMutation,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useGetDeliveryZonesQuery,
  useGetDeliveryZoneQuery,
  useCreateDeliveryZoneMutation,
  useUpdateDeliveryZoneMutation,
  useDeleteDeliveryZoneMutation,
  useGetCouponsQuery,
  useGetCouponQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useGetLoyaltyRewardsQuery,
  useCreateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
  useGetTenantBySlugQuery,
  useUpdateTenantMutation,
  useUploadImageMutation,
} = adminApi;
