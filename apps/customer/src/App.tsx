import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { StoreFront } from './pages/StoreFront';
import { Menu } from './pages/Menu';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { OrderTracking } from './pages/OrderTracking';
import { Account } from './pages/Account';

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
      <Route path="/:slug/*" element={<TenantRoutes />} />
      <Route
        path="*"
        element={
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center p-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                MenuFacil
              </h1>
              <p className="text-gray-500 text-lg">
                Acesse a loja pelo link fornecido pelo restaurante.
              </p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
