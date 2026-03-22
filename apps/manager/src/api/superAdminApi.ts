import { baseApi } from './baseApi';

export const superAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<
      { user: any; access_token: string; refresh_token: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/super-admin/login', method: 'POST', data: body }),
    }),

    // Dashboard
    getStats: builder.query<any, void>({
      query: () => ({ url: '/super-admin/dashboard/stats' }),
      providesTags: ['Dashboard'],
    }),
    getAdvancedStats: builder.query<any, { from: string; to: string }>({
      query: (params) => ({ url: '/super-admin/dashboard/advanced-stats', params }),
      providesTags: ['Dashboard'],
    }),

    // Tenants
    getTenants: builder.query<any, { search?: string; is_active?: string; deleted?: string; plan_id?: string; from?: string; to?: string; sort?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/super-admin/tenants', params: params || undefined }),
      providesTags: ['Tenants'],
    }),
    bulkUpdateTenants: builder.mutation<any, { action: string; ids: string[]; planId?: string }>({
      query: (body) => ({ url: '/super-admin/dashboard/bulk-tenants', method: 'PUT', data: body }),
      invalidatesTags: ['Tenants'],
    }),
    getTenant: builder.query<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Tenants', id }],
    }),
    createTenant: builder.mutation<any, any>({
      query: (body) => ({ url: '/super-admin/tenants', method: 'POST', data: body }),
      invalidatesTags: ['Tenants'],
    }),
    updateTenant: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/super-admin/tenants/${id}`, method: 'PUT', data }),
      invalidatesTags: ['Tenants'],
    }),
    toggleTenantActive: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/toggle-active`, method: 'PATCH' }),
      invalidatesTags: ['Tenants'],
    }),
    changeTenantPlan: builder.mutation<any, { id: string; plan_id: string }>({
      query: ({ id, plan_id }) => ({
        url: `/super-admin/tenants/${id}/plan`,
        method: 'PATCH',
        data: { plan_id },
      }),
      invalidatesTags: ['Tenants'],
    }),
    resetTenantPassword: builder.mutation<any, { id: string; new_password: string }>({
      query: ({ id, new_password }) => ({
        url: `/super-admin/tenants/${id}/reset-password`,
        method: 'PATCH',
        data: { new_password },
      }),
    }),
    updateTenantEmail: builder.mutation<any, { id: string; new_email: string }>({
      query: ({ id, new_email }) => ({
        url: `/super-admin/tenants/${id}/update-email`,
        method: 'PATCH',
        data: { new_email },
      }),
      invalidatesTags: ['Tenants'],
    }),
    revokeAllSessions: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/revoke-all-sessions`, method: 'POST' }),
      invalidatesTags: ['Tenants'],
    }),
    revokeUserSession: builder.mutation<any, { tenantId: string; userId: string }>({
      query: ({ tenantId, userId }) => ({
        url: `/super-admin/tenants/${tenantId}/users/${userId}/revoke-session`,
        method: 'POST',
      }),
      invalidatesTags: ['Tenants'],
    }),
    getTenantUsers: builder.query<any[], string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/users` }),
      providesTags: (_r, _e, id) => [{ type: 'Tenants', id: `${id}-users` }],
    }),
    impersonateTenant: builder.mutation<{ access_token: string; tenant_slug: string; user: any; modules: string[]; permissions: string[]; plan: any }, { id: string; super_admin_id: string }>({
      query: ({ id, super_admin_id }) => ({
        url: `/super-admin/tenants/${id}/impersonate`,
        method: 'POST',
        data: { super_admin_id },
      }),
    }),
    deleteTenant: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tenants'],
    }),
    restoreTenant: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['Tenants'],
    }),
    getTenantWhatsappStatus: builder.query<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/whatsapp/status` }),
    }),
    reconnectTenantWhatsapp: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/whatsapp/reconnect`, method: 'POST' }),
    }),
    disconnectTenantWhatsapp: builder.mutation<any, string>({
      query: (id) => ({ url: `/super-admin/tenants/${id}/whatsapp/disconnect`, method: 'POST' }),
    }),

    // Audit Logs
    getAuditLogs: builder.query<any, {
      action?: string;
      entity_type?: string;
      user_id?: string;
      user_email?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } | void>({
      query: (params) => ({ url: '/super-admin/audit-logs', params: params || undefined }),
      providesTags: ['AuditLogs'],
    }),
    getAuditLogStats: builder.query<any, void>({
      query: () => ({ url: '/super-admin/audit-logs/stats' }),
      providesTags: ['AuditLogs'],
    }),

    // Plans
    getPlans: builder.query<any[], void>({
      query: () => ({ url: '/super-admin/plans' }),
      providesTags: ['Plans'],
    }),
    getPlan: builder.query<any, string>({
      query: (id) => ({ url: `/super-admin/plans/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Plans', id }],
    }),
    createPlan: builder.mutation<any, any>({
      query: (body) => ({ url: '/super-admin/plans', method: 'POST', data: body }),
      invalidatesTags: ['Plans'],
    }),
    updatePlan: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/super-admin/plans/${id}`, method: 'PUT', data }),
      invalidatesTags: ['Plans'],
    }),
    updatePlanModules: builder.mutation<any, { id: string; module_ids: string[] }>({
      query: ({ id, module_ids }) => ({
        url: `/super-admin/plans/${id}/modules`,
        method: 'PUT',
        data: { module_ids },
      }),
      invalidatesTags: ['Plans'],
    }),

    // System Modules
    getSystemModules: builder.query<any[], void>({
      query: () => ({ url: '/super-admin/system-modules' }),
      providesTags: ['SystemModules'],
    }),
    getSystemModule: builder.query<any, string>({
      query: (id) => ({ url: `/super-admin/system-modules/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'SystemModules', id }],
    }),
    createSystemModule: builder.mutation<any, any>({
      query: (body) => ({ url: '/super-admin/system-modules', method: 'POST', data: body }),
      invalidatesTags: ['SystemModules'],
    }),
    updateSystemModule: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/super-admin/system-modules/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['SystemModules'],
    }),
    deleteSystemModule: builder.mutation<void, string>({
      query: (id) => ({ url: `/super-admin/system-modules/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SystemModules'],
    }),

    // Profile
    updateProfile: builder.mutation<any, { name: string }>({
      query: (body) => ({ url: '/super-admin/profile', method: 'PUT', data: body }),
      invalidatesTags: ['Profile'],
    }),
    changePassword: builder.mutation<any, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/super-admin/change-password', method: 'PUT', data: body }),
    }),

    // Permissions
    getPermissions: builder.query<any[], { module_id?: string } | void>({
      query: (params) => ({ url: '/super-admin/permissions', params: params || undefined }),
      providesTags: ['Permissions'],
    }),
    getPermission: builder.query<any, string>({
      query: (id) => ({ url: `/super-admin/permissions/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Permissions', id }],
    }),
    createPermission: builder.mutation<any, any>({
      query: (body) => ({ url: '/super-admin/permissions', method: 'POST', data: body }),
      invalidatesTags: ['Permissions'],
    }),
    updatePermission: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/super-admin/permissions/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Permissions'],
    }),
    deletePermission: builder.mutation<void, string>({
      query: (id) => ({ url: `/super-admin/permissions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Permissions'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetStatsQuery,
  useGetAdvancedStatsQuery,
  useGetTenantsQuery,
  useBulkUpdateTenantsMutation,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useToggleTenantActiveMutation,
  useChangeTenantPlanMutation,
  useResetTenantPasswordMutation,
  useUpdateTenantEmailMutation,
  useRevokeAllSessionsMutation,
  useRevokeUserSessionMutation,
  useGetTenantUsersQuery,
  useImpersonateTenantMutation,
  useDeleteTenantMutation,
  useRestoreTenantMutation,
  useGetTenantWhatsappStatusQuery,
  useReconnectTenantWhatsappMutation,
  useDisconnectTenantWhatsappMutation,
  useGetPlansQuery,
  useGetPlanQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useUpdatePlanModulesMutation,
  useGetSystemModulesQuery,
  useGetSystemModuleQuery,
  useCreateSystemModuleMutation,
  useUpdateSystemModuleMutation,
  useDeleteSystemModuleMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetPermissionsQuery,
  useGetPermissionQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetAuditLogsQuery,
  useGetAuditLogStatsQuery,
} = superAdminApi;
