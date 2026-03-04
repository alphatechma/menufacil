import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CategoryList from './pages/categories/CategoryList';
import CategoryForm from './pages/categories/CategoryForm';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import OrderList from './pages/orders/OrderList';
import OrderDetail from './pages/orders/OrderDetail';
import KDS from './pages/KDS';
import CustomerList from './pages/customers/CustomerList';
import CustomerDetail from './pages/customers/CustomerDetail';
import DeliveryZoneList from './pages/delivery-zones/DeliveryZoneList';
import DeliveryZoneForm from './pages/delivery-zones/DeliveryZoneForm';
import CouponList from './pages/coupons/CouponList';
import CouponForm from './pages/coupons/CouponForm';
import LoyaltyList from './pages/loyalty/LoyaltyList';
import LoyaltyForm from './pages/loyalty/LoyaltyForm';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Customization from './pages/Customization';
import Profile from './pages/Profile';
import MyPlan from './pages/MyPlan';

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
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

          {/* Categories */}
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/:id/edit" element={<CategoryForm />} />

          {/* Products */}
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />

          {/* Orders */}
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />

          {/* KDS */}
          <Route path="kds" element={<KDS />} />

          {/* Customers */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />

          {/* Delivery Zones */}
          <Route path="delivery-zones" element={<DeliveryZoneList />} />
          <Route path="delivery-zones/new" element={<DeliveryZoneForm />} />
          <Route path="delivery-zones/:id/edit" element={<DeliveryZoneForm />} />

          {/* Coupons */}
          <Route path="coupons" element={<CouponList />} />
          <Route path="coupons/new" element={<CouponForm />} />
          <Route path="coupons/:id/edit" element={<CouponForm />} />

          {/* Loyalty */}
          <Route path="loyalty" element={<LoyaltyList />} />
          <Route path="loyalty/new" element={<LoyaltyForm />} />

          {/* Profile & Plan */}
          <Route path="profile" element={<Profile />} />
          <Route path="plano" element={<MyPlan />} />

          {/* Reports, Customization & Settings */}
          <Route path="reports" element={<Reports />} />
          <Route path="customization" element={<Customization />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
