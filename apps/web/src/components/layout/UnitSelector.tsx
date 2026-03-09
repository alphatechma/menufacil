import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useGetUnitsQuery } from '@/api/adminApi';
import { baseApi } from '@/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedUnit, selectSelectedUnitId } from '@/store/slices/uiSlice';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/utils/cn';

const UNIT_SCOPED_TAGS = [
  'Orders', 'Dashboard', 'DeliveryZones', 'DeliveryPersons',
  'Tables', 'TableSessions', 'FloorPlans', 'Reservations',
  'Staff', 'WhatsappStatus',
] as const;

export function UnitSelector() {
  const { hasModule } = usePermission();
  // Always fetch units to auto-select headquarters, regardless of multi_unit module
  const { data: units } = useGetUnitsQuery();
  const dispatch = useAppDispatch();
  const selectedUnitId = useAppSelector(selectSelectedUnitId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-select headquarters unit when no unit is selected
  useEffect(() => {
    if (units && units.length > 0 && !selectedUnitId) {
      const hq = units.find((u: any) => u.is_headquarters);
      const defaultUnit = hq || units[0];
      dispatch(setSelectedUnit(defaultUnit.id));
    }
  }, [units, selectedUnitId, dispatch]);

  const handleSelectUnit = (unitId: string | null) => {
    dispatch(setSelectedUnit(unitId));
    dispatch(baseApi.util.invalidateTags([...UNIT_SCOPED_TAGS]));
    setOpen(false);
  };

  if (!units || units.length === 0) return null;

  // Hide selector when there's only one unit or multi_unit module is not enabled
  if (units.length <= 1 || !hasModule('multi_unit')) return null;

  const selected = units.find((u: any) => u.id === selectedUnitId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Building2 className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {selected ? selected.name : 'Todas as unidades'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
          <button
            onClick={() => handleSelectUnit(null)}
            className={cn(
              'w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors',
              !selectedUnitId && 'bg-primary/5 text-primary font-medium',
            )}
          >
            Todas as unidades
          </button>
          {units.map((unit: any) => (
            <button
              key={unit.id}
              onClick={() => handleSelectUnit(unit.id)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors',
                selectedUnitId === unit.id && 'bg-primary/5 text-primary font-medium',
              )}
            >
              <span>{unit.name}</span>
              {unit.is_headquarters && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">(Matriz)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
