import { baseApi } from './baseApi';

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Public tenant
    getPublicTenant: builder.query<any, string>({
      query: (slug) => ({ url: `/tenants/slug/${slug}`, meta: { authContext: 'public' as const } }),
      providesTags: ['TenantPublic'],
    }),
    checkSlugAvailability: builder.query<{ available: boolean }, string>({
      query: (slug) => ({ url: `/tenants/check-slug/${slug}`, meta: { authContext: 'public' as const } }),
    }),
    registerTenant: builder.mutation<any, { name: string; slug: string; email: string; password: string; phone: string; plan_id: string }>({
      query: (body) => ({ url: '/auth/register-tenant', method: 'POST', data: body, meta: { authContext: 'public' as const } }),
    }),

    // Public plans
    getPlansPublic: builder.query<any[], void>({
      query: () => ({ url: '/plans/public', meta: { authContext: 'public' as const } }),
    }),

    // Public products (customer storefront)
    getStorefrontCategories: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({ url: '/categories', meta: { authContext: 'customer' as const, tenantSlug: slug } }),
    }),
    getStorefrontProducts: builder.query<any[], { slug: string; categoryId?: string }>({
      query: ({ slug, categoryId }) => ({
        url: '/products',
        params: categoryId ? { category_id: categoryId } : undefined,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),
    getStorefrontProduct: builder.query<any, { slug: string; productId: string }>({
      query: ({ slug, productId }) => ({
        url: `/products/${productId}`,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Customer auth
    customerLogin: builder.mutation<
      { access_token: string; customer: any },
      { slug: string; phone?: string; name?: string; email?: string; password?: string }
    >({
      query: ({ slug, ...body }) => ({
        url: '/auth/customer/login',
        method: 'POST',
        data: body,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Customer register
    customerRegister: builder.mutation<
      { access_token: string; refresh_token: string },
      { slug: string; name: string; phone: string; email?: string; password: string }
    >({
      query: ({ slug, ...body }) => ({
        url: '/auth/customer/register',
        method: 'POST',
        data: body,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Customer profile
    getCustomerProfile: builder.query<any, { slug: string }>({
      query: ({ slug }) => ({ url: '/customers/me', meta: { authContext: 'customer' as const, tenantSlug: slug } }),
      providesTags: ['CustomerProfile'],
    }),
    updateCustomerProfile: builder.mutation<any, { slug: string; data: { name?: string; email?: string; password?: string; birth_date?: string; gender?: string; cpf?: string } }>({
      query: ({ slug, data }) => ({
        url: '/customers/me',
        method: 'PUT',
        data,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerProfile'],
    }),
    addCustomerAddress: builder.mutation<void, { slug: string; address: any }>({
      query: ({ slug, address }) => ({
        url: '/customers/me/addresses',
        method: 'POST',
        data: address,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerProfile'],
    }),
    removeCustomerAddress: builder.mutation<void, { slug: string; addressId: string }>({
      query: ({ slug, addressId }) => ({
        url: `/customers/me/addresses/${addressId}`,
        method: 'DELETE',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerProfile'],
    }),

    // Customer orders
    createOrder: builder.mutation<any, { slug: string; data: any }>({
      query: ({ slug, data }) => ({
        url: '/orders',
        method: 'POST',
        data,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerOrders'],
    }),
    getCustomerOrders: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({ url: '/orders/my', meta: { authContext: 'customer' as const, tenantSlug: slug } }),
      providesTags: ['CustomerOrders'],
    }),
    getOrderTracking: builder.query<any, { slug: string; orderId: string }>({
      query: ({ slug, orderId }) => ({
        url: `/orders/${orderId}`,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),
    cancelOrder: builder.mutation<any, { slug: string; orderId: string }>({
      query: ({ slug, orderId }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerOrders'],
    }),

    // Loyalty
    getLoyaltyRewards: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/loyalty/rewards',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['LoyaltyRewards'],
    }),
    redeemReward: builder.mutation<any, { slug: string; rewardId: string }>({
      query: ({ slug, rewardId }) => ({
        url: `/loyalty/redeem/${rewardId}`,
        method: 'POST',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['CustomerProfile', 'LoyaltyRewards', 'LoyaltyRedemptions'],
    }),
    getMyRedemptions: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/loyalty/redemptions/my',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['LoyaltyRedemptions'],
    }),

    // Loyalty Tier
    getMyTier: builder.query<any, { slug: string }>({
      query: ({ slug }) => ({
        url: '/loyalty/my-tier',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['LoyaltyTiers'],
    }),
    getPublicTiers: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/loyalty/tiers/public',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Referrals
    getMyReferralCode: builder.query<{ code: string }, { slug: string }>({
      query: ({ slug }) => ({
        url: '/referrals/my-code',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['Referrals'],
    }),
    getMyReferrals: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/referrals/my-referrals',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['Referrals'],
    }),
    applyReferralCode: builder.mutation<any, { slug: string; code: string }>({
      query: ({ slug, code }) => ({
        url: '/referrals/apply',
        method: 'POST',
        data: { code },
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['Referrals', 'CustomerProfile'],
    }),

    // Coupon validation
    validateCoupon: builder.query<{ discount: number; coupon: any }, { slug: string; code: string; total: number }>({
      query: ({ slug, code, total }) => ({
        url: '/coupons/validate',
        params: { code, total },
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Delivery zones (public on customer side)
    getPublicDeliveryZones: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({ url: '/delivery-zones', meta: { authContext: 'customer' as const, tenantSlug: slug } }),
    }),
    getDeliveryZoneByNeighborhood: builder.query<any, { slug: string; neighborhood: string }>({
      query: ({ slug, neighborhood }) => ({
        url: '/delivery-zones/by-neighborhood',
        params: { neighborhood },
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Public Table (QR code landing)
    getPublicTable: builder.query<any, { slug: string; tableNumber: number }>({
      query: ({ slug, tableNumber }) => ({
        url: `/public/${slug}/tables/${tableNumber}`,
        meta: { authContext: 'public' as const },
      }),
    }),
    joinTable: builder.mutation<any, { slug: string; tableNumber: number }>({
      query: ({ slug, tableNumber }) => ({
        url: `/public/${slug}/tables/${tableNumber}/join`,
        method: 'POST',
        meta: { authContext: 'public' as const },
      }),
    }),

    // Public Units
    getPublicUnits: builder.query<any[], string>({
      query: (tenantSlug) => ({ url: `/public/units/${tenantSlug}`, method: 'GET' }),
    }),

    // Reviews (customer)
    createReview: builder.mutation<any, { slug: string; data: { orderId: string; rating: number; comment?: string } }>({
      query: ({ slug, data }) => ({
        url: '/reviews',
        method: 'POST',
        data,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      invalidatesTags: ['Reviews'],
    }),
    canReviewOrder: builder.query<{ can_review: boolean; reason?: string }, { slug: string; orderId: string }>({
      query: ({ slug, orderId }) => ({
        url: `/reviews/can-review/${orderId}`,
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),
    getMyReviews: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/reviews/my-reviews',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['Reviews'],
    }),

    // Abandoned Cart (customer)
    saveAbandonedCart: builder.mutation<any, { slug: string; items: any[]; total: number }>({
      query: ({ slug, items, total }) => ({
        url: '/abandoned-carts/save',
        method: 'POST',
        data: { items, total },
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),
    getRecoverableCart: builder.query<any, { slug: string }>({
      query: ({ slug }) => ({
        url: '/abandoned-carts/recover',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Active Promotions (storefront)
    getActivePromotions: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/promotions/active',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['Promotions'],
    }),
    evaluateCartPromotions: builder.mutation<any[], { slug: string; items: any[] }>({
      query: ({ slug, items }) => ({
        url: '/promotions/evaluate',
        method: 'POST',
        data: { items },
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
    }),

    // Wallet (customer)
    getWalletBalance: builder.query<{ balance: number }, { slug: string }>({
      query: ({ slug }) => ({
        url: '/wallet/balance',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['Wallet'],
    }),
    getWalletTransactions: builder.query<any[], { slug: string }>({
      query: ({ slug }) => ({
        url: '/wallet/transactions',
        meta: { authContext: 'customer' as const, tenantSlug: slug },
      }),
      providesTags: ['WalletTransactions'],
    }),

    // Public Reservation
    createPublicReservation: builder.mutation<any, { slug: string; data: any }>({
      query: ({ slug, data }) => ({
        url: `/public/${slug}/reservations`,
        method: 'POST',
        data,
        meta: { authContext: 'public' as const },
      }),
    }),
  }),
});

export const {
  useGetPublicTenantQuery,
  useCheckSlugAvailabilityQuery,
  useRegisterTenantMutation,
  useGetPlansPublicQuery,
  useGetStorefrontCategoriesQuery,
  useGetStorefrontProductsQuery,
  useGetStorefrontProductQuery,
  useCustomerLoginMutation,
  useCustomerRegisterMutation,
  useGetCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
  useAddCustomerAddressMutation,
  useRemoveCustomerAddressMutation,
  useCreateOrderMutation,
  useGetCustomerOrdersQuery,
  useGetOrderTrackingQuery,
  useCancelOrderMutation,
  useGetPublicDeliveryZonesQuery,
  useGetDeliveryZoneByNeighborhoodQuery,
  useLazyValidateCouponQuery,
  useGetLoyaltyRewardsQuery,
  useRedeemRewardMutation,
  useGetMyRedemptionsQuery,
  useGetPublicTableQuery,
  useJoinTableMutation,
  useCreatePublicReservationMutation,
  useGetPublicUnitsQuery,
  useCreateReviewMutation,
  useCanReviewOrderQuery,
  useGetMyReviewsQuery,
  useSaveAbandonedCartMutation,
  useGetRecoverableCartQuery,
  useGetMyTierQuery,
  useGetPublicTiersQuery,
  useGetMyReferralCodeQuery,
  useGetMyReferralsQuery,
  useApplyReferralCodeMutation,
  useGetActivePromotionsQuery,
  useEvaluateCartPromotionsMutation,
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
} = customerApi;
