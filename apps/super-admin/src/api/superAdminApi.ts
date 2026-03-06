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

    // Tenants
    getTenants: builder.query<any[], { search?: string; status?: string } | void>({
      query: (params) => ({ url: '/super-admin/tenants', params: params || undefined }),
      providesTags: ['Tenants'],
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
  useGetTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useToggleTenantActiveMutation,
  useChangeTenantPlanMutation,
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
  useGetPermissionsQuery,
  useGetPermissionQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} = superAdminApi;
