import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { StoreFront } from './pages/StoreFront';
import { Menu } from './pages/Menu';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { OrderTracking } from './pages/OrderTracking';
import { Account } from './pages/Account';
import LandingPage from './pages/LandingPage';

function TenantRoutes() {
  return (
    <CustomerLayout>
      <Routes>
        <Route index element={<StoreFront />} />
        <Route path="menu" element={<Menu />} />
        <Route path="menu/:productId" element={<ProductDetail />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:orderId" element={<OrderTracking />} />
        <Route path="account" element={<Account />} />
      </Routes>
    </CustomerLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="/:slug/*" element={<TenantRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
