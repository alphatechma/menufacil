import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const TenantList = lazy(() => import('@/pages/tenants/TenantList'));
const TenantForm = lazy(() => import('@/pages/tenants/TenantForm'));
const TenantDetail = lazy(() => import('@/pages/tenants/TenantDetail'));
const PlanList = lazy(() => import('@/pages/plans/PlanList'));
const PlanForm = lazy(() => import('@/pages/plans/PlanForm'));
const SystemModuleList = lazy(() => import('@/pages/system-modules/SystemModuleList'));
const SystemModuleForm = lazy(() => import('@/pages/system-modules/SystemModuleForm'));
const PermissionList = lazy(() => import('@/pages/permissions/PermissionList'));
const PermissionForm = lazy(() => import('@/pages/permissions/PermissionForm'));
const Settings = lazy(() => import('@/pages/Settings'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

          <Route element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="tenants" element={<TenantList />} />
            <Route path="tenants/new" element={<TenantForm />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="tenants/:id/edit" element={<TenantForm />} />
            <Route path="plans" element={<PlanList />} />
            <Route path="plans/new" element={<PlanForm />} />
            <Route path="plans/:id/edit" element={<PlanForm />} />
            <Route path="system-modules" element={<SystemModuleList />} />
            <Route path="system-modules/new" element={<SystemModuleForm />} />
            <Route path="system-modules/:id/edit" element={<SystemModuleForm />} />
            <Route path="permissions" element={<PermissionList />} />
            <Route path="permissions/new" element={<PermissionForm />} />
            <Route path="permissions/:id/edit" element={<PermissionForm />} />
            <Route path="audit-logs" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
