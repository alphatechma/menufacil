import { Calculator } from 'lucide-react';

export default function PDV() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-400">
      <Calculator className="mb-3 h-12 w-12" />
      <h1 className="text-xl font-semibold text-gray-700">PDV</h1>
      <p className="mt-1 text-sm">Ponto de Venda</p>
    </div>
  );
}
