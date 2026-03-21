import { Receipt } from 'lucide-react';

export default function CashRegister() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-400">
      <Receipt className="mb-3 h-12 w-12" />
      <h1 className="text-xl font-semibold text-gray-700">Caixa</h1>
      <p className="mt-1 text-sm">Controle de caixa</p>
    </div>
  );
}
