import { ShoppingCart } from 'lucide-react';

export default function Orders() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-400">
      <ShoppingCart className="mb-3 h-12 w-12" />
      <h1 className="text-xl font-semibold text-gray-700">Pedidos</h1>
      <p className="mt-1 text-sm">Gerenciamento de pedidos</p>
    </div>
  );
}
