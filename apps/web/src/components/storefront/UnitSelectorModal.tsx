import { MapPin } from 'lucide-react';

interface UnitOption {
  id: string;
  name: string;
  address?: string;
  is_headquarters?: boolean;
}

interface Props {
  units: UnitOption[];
  onSelect: (unitId: string) => void;
}

export function UnitSelectorModal({ units, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--tenant-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-[var(--tenant-primary)]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Selecione a unidade</h2>
          <p className="text-gray-500 mt-2">Escolha a unidade mais proxima de voce</p>
        </div>
        <div className="space-y-3">
          {units.map((unit) => (
            <button
              key={unit.id}
              onClick={() => onSelect(unit.id)}
              className="w-full text-left p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[var(--tenant-primary)] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-[var(--tenant-primary)]">
                    {unit.name}
                    {unit.is_headquarters && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">(Matriz)</span>
                    )}
                  </p>
                  {unit.address && (
                    <p className="text-sm text-gray-500 mt-1">{unit.address}</p>
                  )}
                </div>
                <MapPin className="w-5 h-5 text-gray-300 group-hover:text-[var(--tenant-primary)] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
