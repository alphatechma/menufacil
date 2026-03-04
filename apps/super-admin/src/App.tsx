import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/tenants/TenantList';
import TenantForm from './pages/tenants/TenantForm';
import TenantDetail from './pages/tenants/TenantDetail';
import PlanList from './pages/plans/PlanList';
import PlanForm from './pages/plans/PlanForm';
import SystemModuleList from './pages/system-modules/SystemModuleList';
import SystemModuleForm from './pages/system-modules/SystemModuleForm';
import PermissionList from './pages/permissions/PermissionList';
import PermissionForm from './pages/permissions/PermissionForm';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

          {/* Tenants */}
          <Route path="tenants" element={<TenantList />} />
          <Route path="tenants/new" element={<TenantForm />} />
          <Route path="tenants/:id" element={<TenantDetail />} />
          <Route path="tenants/:id/edit" element={<TenantForm />} />

          {/* Plans */}
          <Route path="plans" element={<PlanList />} />
          <Route path="plans/new" element={<PlanForm />} />
          <Route path="plans/:id/edit" element={<PlanForm />} />

          {/* System Modules */}
          <Route path="system-modules" element={<SystemModuleList />} />
          <Route path="system-modules/new" element={<SystemModuleForm />} />
          <Route path="system-modules/:id/edit" element={<SystemModuleForm />} />

          {/* Permissions */}
          <Route path="permissions" element={<PermissionList />} />
          <Route path="permissions/new" element={<PermissionForm />} />
          <Route path="permissions/:id/edit" element={<PermissionForm />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
