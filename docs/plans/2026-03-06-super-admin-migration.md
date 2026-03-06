# Super-Admin Migration: Redux Toolkit + RTK Query + shadcn/ui

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the super-admin app replacing Zustand with Redux Toolkit, React Query with RTK Query, and all hand-crafted UI with shadcn/ui components.

**Architecture:** Same page structure and routing, new state management layer (Redux store with authSlice + RTK Query baseApi), shadcn/ui component library for all UI elements. Dark mode support via CSS variables.

**Tech Stack:** React 19, Redux Toolkit, RTK Query, shadcn/ui (Radix + Tailwind CSS v4), Recharts, React Router v7

---

### Task 1: Install dependencies and configure project

**Files:**
- Modify: `apps/super-admin/package.json`
- Modify: `apps/super-admin/tsconfig.json`
- Modify: `apps/super-admin/vite.config.ts`
- Create: `apps/super-admin/src/lib/utils.ts`
- Create: `apps/super-admin/components.json`

**Steps:**
1. Remove `zustand`, `@tanstack/react-query`, `axios`
2. Add `@reduxjs/toolkit`, `react-redux`, `axios`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-*` packages needed by shadcn components
3. Add path alias `@/` in tsconfig.json and vite.config.ts
4. Create `cn()` utility in `src/lib/utils.ts`
5. Create `components.json` for shadcn config
6. Run `pnpm install`
7. Verify: `pnpm --filter super-admin build`

---

### Task 2: Setup Redux store, auth slice, and RTK Query base API

**Files:**
- Create: `apps/super-admin/src/store/index.ts`
- Create: `apps/super-admin/src/store/hooks.ts`
- Create: `apps/super-admin/src/store/slices/authSlice.ts`
- Create: `apps/super-admin/src/api/baseApi.ts`
- Create: `apps/super-admin/src/api/axiosBaseQuery.ts`
- Delete: `apps/super-admin/src/store/authStore.ts`
- Delete: `apps/super-admin/src/services/api.ts`

**Steps:**
1. Create `axiosBaseQuery.ts` with Bearer token auth from Redux state, 401 refresh logic
2. Create `baseApi.ts` with RTK Query `createApi`, tag types, `refetchOnFocus: true`
3. Create `authSlice.ts` matching the Zustand store interface but as Redux slice with persist middleware
4. Create `store/index.ts` with `configureStore`, persist middleware, `setupListeners`
5. Create `store/hooks.ts` with typed `useAppDispatch` and `useAppSelector`
6. Delete old Zustand store and axios service files

---

### Task 3: Create RTK Query API endpoints

**Files:**
- Create: `apps/super-admin/src/api/superAdminApi.ts`

**Steps:**
1. Define all endpoints matching existing React Query usage:
   - Auth: `login` mutation
   - Dashboard: `getStats` query
   - Tenants: `getTenants`, `getTenant`, `createTenant`, `updateTenant`, `toggleTenantActive`, `changeTenantPlan`
   - Plans: `getPlans`, `getPlan`, `createPlan`, `updatePlan`, `updatePlanModules`
   - System Modules: `getSystemModules`, `getSystemModule`, `createSystemModule`, `updateSystemModule`, `deleteSystemModule`
   - Permissions: `getPermissions`, `getPermission`, `createPermission`, `updatePermission`, `deletePermission`
   - Profile: `updateProfile`, `changePassword`
2. Add proper `providesTags` / `invalidatesTags` for cache management

---

### Task 4: Update entry points (main.tsx, App.tsx)

**Files:**
- Modify: `apps/super-admin/src/main.tsx`
- Modify: `apps/super-admin/src/App.tsx`

**Steps:**
1. Replace `QueryClientProvider` with Redux `Provider` in `main.tsx`
2. Update `App.tsx` to use `useAppSelector` for auth state instead of `useAuthStore`
3. Verify: app compiles and routes work

---

### Task 5: Create shadcn/ui components

**Files:**
- Create: `apps/super-admin/src/components/ui/button.tsx`
- Create: `apps/super-admin/src/components/ui/input.tsx`
- Create: `apps/super-admin/src/components/ui/label.tsx`
- Create: `apps/super-admin/src/components/ui/card.tsx`
- Create: `apps/super-admin/src/components/ui/badge.tsx`
- Create: `apps/super-admin/src/components/ui/table.tsx`
- Create: `apps/super-admin/src/components/ui/dialog.tsx`
- Create: `apps/super-admin/src/components/ui/select.tsx`
- Create: `apps/super-admin/src/components/ui/textarea.tsx`
- Create: `apps/super-admin/src/components/ui/separator.tsx`
- Create: `apps/super-admin/src/components/ui/dropdown-menu.tsx`
- Create: `apps/super-admin/src/components/ui/sheet.tsx`
- Create: `apps/super-admin/src/components/ui/skeleton.tsx`
- Create: `apps/super-admin/src/components/ui/switch.tsx`
- Create: `apps/super-admin/src/components/ui/checkbox.tsx`
- Create: `apps/super-admin/src/components/ui/tooltip.tsx`
- Create: `apps/super-admin/src/components/ui/tabs.tsx`
- Modify: `apps/super-admin/src/index.css`

**Steps:**
1. Update `index.css` with shadcn/ui CSS variables (indigo theme, dark mode support)
2. Create each shadcn/ui component adapted for Tailwind v4

---

### Task 6: Rewrite SuperAdminLayout with shadcn/ui

**Files:**
- Modify: `apps/super-admin/src/components/layout/SuperAdminLayout.tsx`

**Steps:**
1. Rewrite sidebar using shadcn Sheet (mobile) and fixed panel (desktop)
2. Use shadcn Button, Separator, DropdownMenu for user menu
3. Add dark mode toggle
4. Match apps/web AdminLayout style (collapsible sidebar, user dropdown)
5. Use Redux auth state instead of Zustand

---

### Task 7: Rewrite Login page

**Files:**
- Modify: `apps/super-admin/src/pages/Login.tsx`

**Steps:**
1. Use shadcn Card, Input, Label, Button
2. Use RTK Query `useLoginMutation` instead of direct axios call
3. Dispatch Redux `login` action on success

---

### Task 8: Rewrite Dashboard page

**Files:**
- Modify: `apps/super-admin/src/pages/Dashboard.tsx`

**Steps:**
1. Use shadcn Card, Skeleton for loading states
2. Use RTK Query `useGetStatsQuery`
3. Keep Recharts for bar chart
4. Dark mode support

---

### Task 9: Rewrite Tenants pages (List, Form, Detail)

**Files:**
- Modify: `apps/super-admin/src/pages/tenants/TenantList.tsx`
- Modify: `apps/super-admin/src/pages/tenants/TenantForm.tsx`
- Modify: `apps/super-admin/src/pages/tenants/TenantDetail.tsx`

**Steps:**
1. TenantList: shadcn Table, Input (search), Select (filter), Badge (status), Button
2. TenantForm: shadcn Card, Input, Label, Select, Button
3. TenantDetail: shadcn Card, Badge, Button, Dialog (confirmations), Select (plan change)
4. All use RTK Query hooks instead of React Query

---

### Task 10: Rewrite Plans pages (List, Form)

**Files:**
- Modify: `apps/super-admin/src/pages/plans/PlanList.tsx`
- Modify: `apps/super-admin/src/pages/plans/PlanForm.tsx`

**Steps:**
1. PlanList: shadcn Card grid, Badge, Button
2. PlanForm: shadcn Card, Input, Label, Switch, Checkbox (modules), Button
3. Use RTK Query hooks

---

### Task 11: Rewrite System Modules pages (List, Form)

**Files:**
- Modify: `apps/super-admin/src/pages/system-modules/SystemModuleList.tsx`
- Modify: `apps/super-admin/src/pages/system-modules/SystemModuleForm.tsx`

**Steps:**
1. SystemModuleList: shadcn Table, Button, Dialog (delete confirmation)
2. SystemModuleForm: shadcn Card, Input, Label, Textarea, Button
3. Use RTK Query hooks

---

### Task 12: Rewrite Permissions pages (List, Form)

**Files:**
- Modify: `apps/super-admin/src/pages/permissions/PermissionList.tsx`
- Modify: `apps/super-admin/src/pages/permissions/PermissionForm.tsx`

**Steps:**
1. PermissionList: shadcn Card (grouped by module), Badge, Select (filter), Button, Dialog (delete)
2. PermissionForm: shadcn Card, Input, Label, Select (module), Button
3. Use RTK Query hooks

---

### Task 13: Rewrite Settings page

**Files:**
- Modify: `apps/super-admin/src/pages/Settings.tsx`

**Steps:**
1. Use shadcn Card, Input, Label, Separator, Button
2. Profile edit + password change sections
3. Use RTK Query mutations

---

### Task 14: Final build verification and commit

**Steps:**
1. Run `pnpm --filter super-admin build` - must pass
2. Manually verify all routes render
3. Commit all changes
