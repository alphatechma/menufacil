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
    createProduct: builder.mutation<any, any>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/products/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Products'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Products'],
    }),

    // Categories
    getCategories: builder.query<any[], void>({
      query: () => ({ url: '/categories/all' }),
      providesTags: ['Categories'],
    }),
    createCategory: builder.mutation<any, any>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/categories/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Categories'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Categories'],
    }),

    // Extra Groups
    getExtraGroups: builder.query<any[], void>({
      query: () => ({ url: '/extra-groups' }),
      providesTags: ['ExtraGroups'],
    }),
    createExtraGroup: builder.mutation<any, any>({
      query: (body) => ({ url: '/extra-groups', method: 'POST', body }),
      invalidatesTags: ['ExtraGroups'],
    }),
    updateExtraGroup: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/extra-groups/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['ExtraGroups'],
    }),
    deleteExtraGroup: builder.mutation<void, string>({
      query: (id) => ({ url: `/extra-groups/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ExtraGroups'],
    }),

    // Customers
    getCustomers: builder.query<any[], void>({
      query: () => ({ url: '/customers' }),
      providesTags: ['Customers'],
    }),
    getCustomer: builder.query<any, string>({
      query: (id) => ({ url: `/customers/${id}` }),
      providesTags: ['Customers'],
    }),
    createCustomer: builder.mutation<any, { name: string; phone: string; email?: string }>({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customers'],
    }),

    // Coupons
    getCoupons: builder.query<any[], void>({
      query: () => ({ url: '/coupons' }),
      providesTags: ['Coupons'],
    }),
    createCoupon: builder.mutation<any, any>({
      query: (body) => ({ url: '/coupons', method: 'POST', body }),
      invalidatesTags: ['Coupons'],
    }),
    updateCoupon: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/coupons/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Coupons'],
    }),
    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({ url: `/coupons/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Coupons'],
    }),

    // Delivery Zones
    getDeliveryZones: builder.query<any[], void>({
      query: () => ({ url: '/delivery-zones' }),
      providesTags: ['DeliveryZones'],
    }),
    createDeliveryZone: builder.mutation<any, any>({
      query: (body) => ({ url: '/delivery-zones', method: 'POST', body }),
      invalidatesTags: ['DeliveryZones'],
    }),
    updateDeliveryZone: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/delivery-zones/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['DeliveryZones'],
    }),
    deleteDeliveryZone: builder.mutation<void, string>({
      query: (id) => ({ url: `/delivery-zones/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DeliveryZones'],
    }),

    // Delivery Persons
    getDeliveryPersons: builder.query<any[], void>({
      query: () => ({ url: '/delivery-persons' }),
      providesTags: ['DeliveryPersons'],
    }),
    createDeliveryPerson: builder.mutation<any, any>({
      query: (body) => ({ url: '/delivery-persons', method: 'POST', body }),
      invalidatesTags: ['DeliveryPersons'],
    }),
    updateDeliveryPerson: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/delivery-persons/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['DeliveryPersons'],
    }),
    deleteDeliveryPerson: builder.mutation<void, string>({
      query: (id) => ({ url: `/delivery-persons/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DeliveryPersons'],
    }),

    // Tables
    getTables: builder.query<any[], void>({
      query: () => ({ url: '/tables' }),
      providesTags: ['Tables'],
    }),
    createTable: builder.mutation<any, any>({
      query: (body) => ({ url: '/tables', method: 'POST', body }),
      invalidatesTags: ['Tables'],
    }),
    updateTable: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/tables/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Tables'],
    }),
    deleteTable: builder.mutation<void, string>({
      query: (id) => ({ url: `/tables/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tables'],
    }),

    // Reservations
    getReservations: builder.query<any[], void>({
      query: () => ({ url: '/reservations' }),
      providesTags: ['Reservations'],
    }),
    updateReservationStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/reservations/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Reservations'],
    }),

    // Floor Plans
    getFloorPlans: builder.query<any[], void>({
      query: () => ({ url: '/floor-plans' }),
      providesTags: ['FloorPlans'],
    }),
    updateFloorPlan: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/floor-plans/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['FloorPlans'],
    }),

    // Staff
    getStaff: builder.query<any[], void>({
      query: () => ({ url: '/users' }),
      providesTags: ['Staff'],
    }),
    createStaff: builder.mutation<any, any>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/users/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Staff'],
    }),

    // Roles
    getRoles: builder.query<any[], void>({
      query: () => ({ url: '/roles' }),
      providesTags: ['Roles'],
    }),
    getPermissions: builder.query<any[], void>({
      query: () => ({ url: '/roles/permissions' }),
    }),

    // Dashboard
    getDashboardData: builder.query<any, { since: string; until: string }>({
      query: ({ since, until }) => ({ url: `/orders/stats/dashboard?since=${since}&until=${until}` }),
      providesTags: ['Dashboard'],
    }),
    getAdvancedStats: builder.query<any, { from: string; to: string }>({
      query: (params) => ({ url: '/orders/stats/advanced', params }),
      providesTags: ['Dashboard'],
    }),

    // Loyalty
    getLoyaltyRewards: builder.query<any[], void>({
      query: () => ({ url: '/loyalty/rewards' }),
      providesTags: ['Loyalty'],
    }),
    createLoyaltyReward: builder.mutation<any, any>({
      query: (body) => ({ url: '/loyalty/rewards', method: 'POST', body }),
      invalidatesTags: ['Loyalty'],
    }),
    updateLoyaltyReward: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/loyalty/rewards/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Loyalty'],
    }),
    deleteLoyaltyReward: builder.mutation<void, string>({
      query: (id) => ({ url: `/loyalty/rewards/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Loyalty'],
    }),

    // Inventory
    getInventoryItems: builder.query<any[], void>({
      query: () => ({ url: '/inventory/items' }),
      providesTags: ['Inventory'],
    }),
    createInventoryItem: builder.mutation<any, any>({
      query: (body) => ({ url: '/inventory/items', method: 'POST', body }),
      invalidatesTags: ['Inventory'],
    }),
    updateInventoryItem: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/inventory/items/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Inventory'],
    }),
    deleteInventoryItem: builder.mutation<void, string>({
      query: (id) => ({ url: `/inventory/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Inventory'],
    }),
    getStockMovements: builder.query<any[], void>({
      query: () => ({ url: '/inventory/movements' }),
      providesTags: ['Inventory'],
    }),
    createStockMovement: builder.mutation<any, any>({
      query: (body) => ({ url: '/inventory/movements', method: 'POST', body }),
      invalidatesTags: ['Inventory'],
    }),

    // Units
    getUnits: builder.query<any[], void>({
      query: () => ({ url: '/units' }),
      providesTags: ['Units'],
    }),

    // Tenant
    getTenantBySlug: builder.query<any, string>({
      query: (slug) => ({ url: `/tenants/slug/${slug}` }),
      providesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/tenants/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Tenant'],
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
    assignDeliveryPerson: builder.mutation<void, { id: string; delivery_person_id: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/delivery-person`, method: 'PUT', body }),
      invalidatesTags: ['Orders'],
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
  // Products
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  // Categories
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  // Extra Groups
  useGetExtraGroupsQuery,
  useCreateExtraGroupMutation,
  useUpdateExtraGroupMutation,
  useDeleteExtraGroupMutation,
  // Customers
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  // Coupons
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  // Delivery Zones
  useGetDeliveryZonesQuery,
  useCreateDeliveryZoneMutation,
  useUpdateDeliveryZoneMutation,
  useDeleteDeliveryZoneMutation,
  // Delivery Persons
  useGetDeliveryPersonsQuery,
  useCreateDeliveryPersonMutation,
  useUpdateDeliveryPersonMutation,
  useDeleteDeliveryPersonMutation,
  // Tables
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  // Reservations
  useGetReservationsQuery,
  useUpdateReservationStatusMutation,
  // Floor Plans
  useGetFloorPlansQuery,
  useUpdateFloorPlanMutation,
  // Staff
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  // Roles
  useGetRolesQuery,
  useGetPermissionsQuery,
  // Dashboard
  useGetDashboardDataQuery,
  useGetAdvancedStatsQuery,
  // Loyalty
  useGetLoyaltyRewardsQuery,
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
  // Inventory
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetStockMovementsQuery,
  useCreateStockMovementMutation,
  // Units
  useGetUnitsQuery,
  // Tenant
  useGetTenantBySlugQuery,
  useUpdateTenantMutation,
  // Orders
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useCreateAdminOrderMutation,
  useAssignDeliveryPersonMutation,
  // Cash Register
  useGetCashRegisterQuery,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
  // WhatsApp
  useGetWhatsappStatusQuery,
  useConnectWhatsappMutation,
  useDisconnectWhatsappMutation,
} = api;
