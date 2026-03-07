import { baseApi } from './baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Auth
    adminLogin: builder.mutation<
      { user: any; access_token: string; refresh_token: string; modules: string[]; permissions: string[]; plan: any; tenant_slug: string },
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
    updateOrderStatus: builder.mutation<void, { id: string; status: string; delivery_person_id?: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/status`, method: 'PUT', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Orders', 'Dashboard'],
    }),
    getDashboardData: builder.query<any, { since: string; until: string; status?: string; payment_method?: string; delivery_person_id?: string }>({
      query: ({ since, until, status, payment_method, delivery_person_id }) => ({
        url: '/orders/stats/dashboard',
        params: { since, until, ...(status && { status }), ...(payment_method && { payment_method }), ...(delivery_person_id && { delivery_person_id }) },
        meta: { authContext: 'admin' as const },
      }),
      providesTags: ['Dashboard'],
    }),
    getOrderPerformanceStats: builder.query<any, { days?: number }>({
      query: ({ days } = {}) => ({
        url: '/orders/stats/performance',
        params: days ? { days } : undefined,
        meta: { authContext: 'admin' as const },
      }),
      providesTags: ['Orders'],
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
      query: () => ({ url: '/loyalty/rewards/all', meta: { authContext: 'admin' as const } }),
      providesTags: ['Loyalty'],
    }),
    createLoyaltyReward: builder.mutation<void, any>({
      query: (body) => ({ url: '/loyalty/rewards', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Loyalty'],
    }),
    updateLoyaltyReward: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/loyalty/rewards/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Loyalty'],
    }),
    deleteLoyaltyReward: builder.mutation<void, string>({
      query: (id) => ({ url: `/loyalty/rewards/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Loyalty'],
    }),
    getLoyaltyRedemptions: builder.query<any[], void>({
      query: () => ({ url: '/loyalty/redemptions', meta: { authContext: 'admin' as const } }),
      providesTags: ['Loyalty'],
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

    // Delivery Persons
    getDeliveryPersons: builder.query<any[], void>({
      query: () => ({ url: '/delivery-persons', meta: { authContext: 'admin' as const } }),
      providesTags: ['DeliveryPersons'],
    }),
    getDeliveryPerson: builder.query<any, string>({
      query: (id) => ({ url: `/delivery-persons/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'DeliveryPersons', id }],
    }),
    createDeliveryPerson: builder.mutation<void, { name: string; phone: string; vehicle?: string; user_id?: string }>({
      query: (body) => ({ url: '/delivery-persons', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryPersons'],
    }),
    updateDeliveryPerson: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/delivery-persons/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryPersons'],
    }),
    deleteDeliveryPerson: builder.mutation<void, string>({
      query: (id) => ({ url: `/delivery-persons/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['DeliveryPersons'],
    }),
    assignDeliveryPerson: builder.mutation<void, { orderId: string; delivery_person_id: string | null }>({
      query: ({ orderId, ...body }) => ({ url: `/orders/${orderId}/delivery-person`, method: 'PUT', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Orders', 'DeliveryPersons', 'Dashboard'],
    }),

    // Roles & Permissions
    getRoles: builder.query<any[], void>({
      query: () => ({ url: '/roles', meta: { authContext: 'admin' as const } }),
      providesTags: ['Roles'],
    }),
    getRole: builder.query<any, string>({
      query: (id) => ({ url: `/roles/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Roles', id }],
    }),
    getPermissions: builder.query<any[], void>({
      query: () => ({ url: '/roles/permissions', meta: { authContext: 'admin' as const } }),
    }),
    createRole: builder.mutation<any, { name: string; description?: string; permission_ids: string[] }>({
      query: (body) => ({ url: '/roles', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Roles'],
    }),
    updateRole: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/roles/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Roles'],
    }),
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Roles'],
    }),

    // Staff
    getStaff: builder.query<any[], void>({
      query: () => ({ url: '/users', meta: { authContext: 'admin' as const } }),
      providesTags: ['Staff'],
    }),
    getStaffMember: builder.query<any, string>({
      query: (id) => ({ url: `/users/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: (_result, _err, id) => [{ type: 'Staff', id }],
    }),
    createStaff: builder.mutation<void, { name: string; email: string; password: string; role_id: string }>({
      query: (body) => ({ url: '/users', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/users/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Staff'],
    }),

    // Tables
    getTables: builder.query<any[], void>({
      query: () => ({ url: '/tables', meta: { authContext: 'admin' as const } }),
      providesTags: ['Tables'],
    }),
    createTable: builder.mutation<void, any>({
      query: (body) => ({ url: '/tables', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables'],
    }),
    updateTable: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/tables/${id}`, method: 'PATCH', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables'],
    }),
    deleteTable: builder.mutation<void, string>({
      query: (id) => ({ url: `/tables/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables'],
    }),
    updateTableStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/tables/${id}/status`, method: 'PATCH', data: { status }, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables'],
    }),
    getTableQr: builder.query<{ url: string; tableNumber: number }, string>({
      query: (id) => ({ url: `/tables/${id}/qr`, meta: { authContext: 'admin' as const } }),
    }),

    // Table Sessions
    openTableSession: builder.mutation<any, { table_id: string; opened_by?: string }>({
      query: (body) => ({ url: '/table-sessions/open', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables', 'TableSessions'],
    }),
    closeTableSession: builder.mutation<any, string>({
      query: (id) => ({ url: `/table-sessions/${id}/close`, method: 'POST', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables', 'TableSessions'],
    }),
    getTableSession: builder.query<any, string>({
      query: (id) => ({ url: `/table-sessions/${id}`, meta: { authContext: 'admin' as const } }),
      providesTags: ['TableSessions'],
    }),
    getActiveTableSession: builder.query<any, string>({
      query: (tableId) => ({ url: `/table-sessions/active/${tableId}`, meta: { authContext: 'admin' as const } }),
      providesTags: ['TableSessions'],
    }),
    transferTableSession: builder.mutation<any, { id: string; table_id: string }>({
      query: ({ id, table_id }) => ({ url: `/table-sessions/${id}/transfer`, method: 'POST', data: { table_id }, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Tables', 'TableSessions'],
    }),
    getSessionBill: builder.query<any, string>({
      query: (id) => ({ url: `/table-sessions/${id}/bill`, meta: { authContext: 'admin' as const } }),
      providesTags: ['TableSessions'],
    }),
    splitBillEqual: builder.mutation<any, { id: string; number_of_people: number }>({
      query: ({ id, number_of_people }) => ({ url: `/table-sessions/${id}/split-equal`, method: 'POST', data: { number_of_people }, meta: { authContext: 'admin' as const } }),
    }),
    splitBillByConsumption: builder.query<any, string>({
      query: (id) => ({ url: `/table-sessions/${id}/split-consumption`, meta: { authContext: 'admin' as const } }),
    }),

    // Reservations
    getReservations: builder.query<any[], { date?: string; status?: string }>({
      query: (params) => ({ url: '/reservations', params, meta: { authContext: 'admin' as const } }),
      providesTags: ['Reservations'],
    }),
    createReservation: builder.mutation<void, any>({
      query: (body) => ({ url: '/reservations', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Reservations'],
    }),
    updateReservationStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/reservations/${id}/status`, method: 'PATCH', data: { status }, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Reservations'],
    }),

    // Floor Plans
    getFloorPlans: builder.query<any[], void>({
      query: () => ({ url: '/floor-plans', meta: { authContext: 'admin' as const } }),
      providesTags: ['FloorPlans'],
    }),
    createFloorPlan: builder.mutation<any, any>({
      query: (body) => ({ url: '/floor-plans', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['FloorPlans'],
    }),
    updateFloorPlan: builder.mutation<void, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/floor-plans/${id}`, method: 'PATCH', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['FloorPlans'],
    }),
    deleteFloorPlan: builder.mutation<void, string>({
      query: (id) => ({ url: `/floor-plans/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['FloorPlans'],
    }),

    // WhatsApp
    connectWhatsapp: builder.mutation<{ qrcode?: string; pairingCode?: string; instance: any }, void>({
      query: () => ({ url: '/whatsapp/instance/connect', method: 'POST', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappStatus'],
    }),
    disconnectWhatsapp: builder.mutation<void, void>({
      query: () => ({ url: '/whatsapp/instance/disconnect', method: 'POST', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappStatus'],
    }),
    getWhatsappStatus: builder.query<{ status: string; phone_number: string | null }, void>({
      query: () => ({ url: '/whatsapp/instance/status', meta: { authContext: 'admin' as const } }),
      providesTags: ['WhatsappStatus'],
    }),
    getWhatsappTemplates: builder.query<any[], void>({
      query: () => ({ url: '/whatsapp/templates', meta: { authContext: 'admin' as const } }),
      providesTags: ['WhatsappTemplates'],
    }),
    createWhatsappTemplate: builder.mutation<any, { name: string; type: string; content: string; is_active?: boolean }>({
      query: (body) => ({ url: '/whatsapp/templates', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappTemplates'],
    }),
    updateWhatsappTemplate: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/whatsapp/templates/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappTemplates'],
    }),
    deleteWhatsappTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/whatsapp/templates/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappTemplates'],
    }),
    getWhatsappConversations: builder.query<any[], void>({
      query: () => ({ url: '/whatsapp/conversations', meta: { authContext: 'admin' as const } }),
      providesTags: ['WhatsappConversations'],
    }),
    getWhatsappMessages: builder.query<any[], string>({
      query: (phone) => ({ url: `/whatsapp/conversations/${phone}`, meta: { authContext: 'admin' as const } }),
      providesTags: ['WhatsappMessages'],
    }),
    sendWhatsappMessage: builder.mutation<any, { phone: string; content: string }>({
      query: (body) => ({ url: '/whatsapp/messages/send', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['WhatsappConversations'],
    }),

    // Units
    getUnits: builder.query<any[], void>({
      query: () => ({ url: '/units', method: 'GET', meta: { authContext: 'admin' as const } }),
      providesTags: ['Units'],
    }),
    getUnit: builder.query<any, string>({
      query: (id) => ({ url: `/units/${id}`, method: 'GET', meta: { authContext: 'admin' as const } }),
      providesTags: ['Units'],
    }),
    createUnit: builder.mutation<any, any>({
      query: (data) => ({ url: '/units', method: 'POST', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Units'],
    }),
    updateUnit: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/units/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Units'],
    }),
    deleteUnit: builder.mutation<void, string>({
      query: (id) => ({ url: `/units/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
      invalidatesTags: ['Units'],
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
  useGetDashboardDataQuery,
  useGetOrderPerformanceStatsQuery,
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
  useUpdateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
  useGetLoyaltyRedemptionsQuery,
  useGetTenantBySlugQuery,
  useUpdateTenantMutation,
  useUploadImageMutation,
  useGetDeliveryPersonsQuery,
  useGetDeliveryPersonQuery,
  useCreateDeliveryPersonMutation,
  useUpdateDeliveryPersonMutation,
  useDeleteDeliveryPersonMutation,
  useAssignDeliveryPersonMutation,
  useGetStaffQuery,
  useGetStaffMemberQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetRolesQuery,
  useGetRoleQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useUpdateTableStatusMutation,
  useGetTableQrQuery,
  useOpenTableSessionMutation,
  useCloseTableSessionMutation,
  useGetTableSessionQuery,
  useGetActiveTableSessionQuery,
  useTransferTableSessionMutation,
  useGetSessionBillQuery,
  useSplitBillEqualMutation,
  useSplitBillByConsumptionQuery,
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationStatusMutation,
  useGetFloorPlansQuery,
  useCreateFloorPlanMutation,
  useUpdateFloorPlanMutation,
  useDeleteFloorPlanMutation,
  useConnectWhatsappMutation,
  useDisconnectWhatsappMutation,
  useGetWhatsappStatusQuery,
  useGetWhatsappTemplatesQuery,
  useCreateWhatsappTemplateMutation,
  useUpdateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
  useGetWhatsappConversationsQuery,
  useGetWhatsappMessagesQuery,
  useSendWhatsappMessageMutation,
  useGetUnitsQuery,
  useGetUnitQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
} = adminApi;
