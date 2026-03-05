import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from '@/routes/AdminProtectedRoute';
import { AdminGuestRoute } from '@/routes/AdminGuestRoute';
import { TenantProvider } from '@/routes/TenantProvider';
import AdminLayout from '@/components/layout/AdminLayout';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { PageSpinner } from '@/components/ui/Spinner';

// Admin pages
const AdminLogin = lazy(() => import('@/pages/admin/Login'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const CategoryList = lazy(() => import('@/pages/admin/categories/CategoryList'));
const CategoryForm = lazy(() => import('@/pages/admin/categories/CategoryForm'));
const ProductList = lazy(() => import('@/pages/admin/products/ProductList'));
const ProductForm = lazy(() => import('@/pages/admin/products/ProductForm'));
const OrderList = lazy(() => import('@/pages/admin/orders/OrderList'));
const OrderDetail = lazy(() => import('@/pages/admin/orders/OrderDetail'));
const KDS = lazy(() => import('@/pages/admin/KDS'));
const CustomerList = lazy(() => import('@/pages/admin/customers/CustomerList'));
const CustomerDetail = lazy(() => import('@/pages/admin/customers/CustomerDetail'));
const DeliveryZoneList = lazy(() => import('@/pages/admin/delivery-zones/DeliveryZoneList'));
const DeliveryZoneForm = lazy(() => import('@/pages/admin/delivery-zones/DeliveryZoneForm'));
const CouponList = lazy(() => import('@/pages/admin/coupons/CouponList'));
const CouponForm = lazy(() => import('@/pages/admin/coupons/CouponForm'));
const LoyaltyList = lazy(() => import('@/pages/admin/loyalty/LoyaltyList'));
const LoyaltyForm = lazy(() => import('@/pages/admin/loyalty/LoyaltyForm'));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const Customization = lazy(() => import('@/pages/admin/Customization'));
const Profile = lazy(() => import('@/pages/admin/Profile'));
const MyPlan = lazy(() => import('@/pages/admin/MyPlan'));

// Customer / storefront pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const StoreFront = lazy(() => import('@/pages/storefront/StoreFront'));
const MenuPage = lazy(() => import('@/pages/storefront/Menu'));
const ProductDetailPage = lazy(() => import('@/pages/storefront/ProductDetail'));
const Checkout = lazy(() => import('@/pages/storefront/Checkout'));
const OrderTracking = lazy(() => import('@/pages/storefront/OrderTracking'));
const Account = lazy(() => import('@/pages/storefront/Account'));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Static routes first — BEFORE /:slug to avoid conflicts */}

        {/* Landing page */}
        <Route index element={<LandingPage />} />

        {/* Admin login (guest only) */}
        <Route
          path="/login"
          element={
            <AdminGuestRoute>
              <AdminLogin />
            </AdminGuestRoute>
          }
        />

        {/* Admin protected routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/:id/edit" element={<CategoryForm />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="kds" element={<KDS />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="delivery-zones" element={<DeliveryZoneList />} />
          <Route path="delivery-zones/new" element={<DeliveryZoneForm />} />
          <Route path="delivery-zones/:id/edit" element={<DeliveryZoneForm />} />
          <Route path="coupons" element={<CouponList />} />
          <Route path="coupons/new" element={<CouponForm />} />
          <Route path="coupons/:id/edit" element={<CouponForm />} />
          <Route path="loyalty" element={<LoyaltyList />} />
          <Route path="loyalty/new" element={<LoyaltyForm />} />
          <Route path="reports" element={<Reports />} />
          <Route path="customization" element={<Customization />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="plano" element={<MyPlan />} />
        </Route>

        {/* Tenant storefront routes — /:slug AFTER static routes */}
        <Route path="/:slug" element={<TenantProvider />}>
          <Route element={<CustomerLayout />}>
            <Route index element={<StoreFront />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="menu/:productId" element={<ProductDetailPage />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:orderId" element={<OrderTracking />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
