import { Printer } from 'lucide-react';

export default function PrinterManager() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-400">
      <Printer className="mb-3 h-12 w-12" />
      <h1 className="text-xl font-semibold text-gray-700">Impressora</h1>
      <p className="mt-1 text-sm">Configuração de impressoras</p>
    </div>
  );
}
