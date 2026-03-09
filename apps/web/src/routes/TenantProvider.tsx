import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTenant, setSelectedUnitId } from '@/store/slices/tenantSlice';
import { useGetPublicTenantQuery, useGetPublicUnitsQuery } from '@/api/customerApi';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { Spinner } from '@/components/ui/Spinner';
import { UnitSelectorModal } from '@/components/storefront/UnitSelectorModal';

const DAY_MAP: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

const DAY_LABELS: Record<string, string> = {
  sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terca', wednesday: 'Quarta',
  thursday: 'Quinta', friday: 'Sexta', saturday: 'Sabado',
};
const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Normalize business_hours entry - supports both old and new format
function getOpenTime(cfg: any): string | null {
  if (!cfg) return null;
  if (typeof cfg.openTime === 'string') return cfg.openTime;
  if (typeof cfg.open_time === 'string') return cfg.open_time;
  if (typeof cfg.open === 'string' && cfg.open.includes(':')) return cfg.open;
  return null;
}
function getCloseTime(cfg: any): string | null {
  if (!cfg) return null;
  if (typeof cfg.closeTime === 'string') return cfg.closeTime;
  if (typeof cfg.close_time === 'string') return cfg.close_time;
  if (typeof cfg.close === 'string' && cfg.close.includes(':')) return cfg.close;
  return null;
}
function isDayOpen(cfg: any): boolean {
  if (!cfg) return false;
  // New format: { open: boolean, openTime, closeTime }
  if (typeof cfg.open === 'boolean') return cfg.open;
  // Old format: { open: "11:00", close: "23:00" } — if open is a time string, it's open
  if (typeof cfg.open === 'string' && cfg.open.includes(':')) return true;
  return !!cfg.openTime;
}

function computeStoreStatus(businessHours: Record<string, any> | null): { is_open: boolean; next_open_label: string | null; hours_label: string | null } {
  if (!businessHours) return { is_open: true, next_open_label: null, hours_label: null };
  const now = new Date();
  const dayKey = DAY_MAP[now.getDay()];
  const dayConfig = businessHours[dayKey];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Build today's hours label
  const todayOpen = getOpenTime(dayConfig);
  const todayClose = getCloseTime(dayConfig);
  const hours_label = (dayConfig && isDayOpen(dayConfig) && todayOpen && todayClose)
    ? `Hoje: ${todayOpen} - ${todayClose}`
    : (dayConfig && isDayOpen(dayConfig))
      ? 'Aberto hoje'
      : null;

  if (dayConfig && isDayOpen(dayConfig)) {
    const openTimeStr = todayOpen;
    const closeTimeStr = todayClose;

    // Day is marked as open but has no time constraints — open all day
    if (!openTimeStr || !closeTimeStr) {
      return { is_open: true, next_open_label: null, hours_label: hours_label || 'Aberto hoje' };
    }

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);
    const openMin = openH * 60 + openM;
    let closeMin = closeH * 60 + closeM;
    if (closeMin <= openMin) closeMin += 24 * 60;
    const adjustedCurrent = currentMinutes < openMin ? currentMinutes + 24 * 60 : currentMinutes;

    if (adjustedCurrent >= openMin && adjustedCurrent < closeMin) {
      return { is_open: true, next_open_label: null, hours_label };
    }

    // Store is closed but opens later today
    if (currentMinutes < openMin) {
      return { is_open: false, next_open_label: `Abre hoje as ${openTimeStr}`, hours_label };
    }
  }

  // Find next open day
  const currentDayIndex = now.getDay();
  for (let offset = 1; offset <= 7; offset++) {
    const nextIndex = (currentDayIndex + offset) % 7;
    const nextDayKey = DAYS_ORDER[nextIndex];
    const nextDayConfig = businessHours[nextDayKey];
    if (nextDayConfig && isDayOpen(nextDayConfig)) {
      const nextOpenTime = getOpenTime(nextDayConfig);
      if (!nextOpenTime) continue;
      if (offset === 1) {
        return { is_open: false, next_open_label: `Abre amanha as ${nextOpenTime}`, hours_label };
      }
      return { is_open: false, next_open_label: `Abre ${DAY_LABELS[nextDayKey]} as ${nextOpenTime}`, hours_label };
    }
  }

  return { is_open: false, next_open_label: null, hours_label };
}

export function TenantProvider() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const tenant = useAppSelector((s) => s.tenant.tenant);
  const selectedUnitId = useAppSelector((s) => s.tenant.selectedUnitId);

  const { data, isLoading, error } = useGetPublicTenantQuery(slug!, { skip: !slug });
  const { data: units } = useGetPublicUnitsQuery(slug!, { skip: !slug || !data });

  // Restore selected unit from localStorage on mount
  useEffect(() => {
    if (slug) {
      const stored = localStorage.getItem(`menufacil-unit-${slug}`);
      if (stored) {
        dispatch(setSelectedUnitId(stored));
      }
    }
  }, [slug, dispatch]);

  useEffect(() => {
    if (data) {
      const { is_open, next_open_label, hours_label } = computeStoreStatus(data.business_hours);
      dispatch(setTenant({ ...data, is_open, next_open_label, hours_label }));
    }
  }, [data, dispatch]);

  // Override store status with unit-specific business_hours when a unit is selected
  useEffect(() => {
    if (data && units && selectedUnitId) {
      const selectedUnit = units.find((u: any) => u.id === selectedUnitId);
      if (selectedUnit?.business_hours) {
        const { is_open, next_open_label, hours_label } = computeStoreStatus(selectedUnit.business_hours);
        dispatch(setTenant({ ...data, is_open, next_open_label, hours_label }));
      }
    }
  }, [selectedUnitId, units, data, dispatch]);

  const handleSelectUnit = (unitId: string) => {
    dispatch(setSelectedUnitId(unitId));
    if (slug) {
      localStorage.setItem(`menufacil-unit-${slug}`, unitId);
    }
  };

  useTenantBranding(tenant);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Loja nao encontrada</h2>
          <p className="text-gray-500">Verifique o endereco e tente novamente.</p>
        </div>
      </div>
    );
  }

  // Show unit selector if tenant has multiple units and none is selected
  if (units && units.length > 0 && !selectedUnitId) {
    const storedUnit = slug ? localStorage.getItem(`menufacil-unit-${slug}`) : null;
    const validStored = storedUnit && units.find((u: any) => u.id === storedUnit);
    if (validStored) {
      handleSelectUnit(storedUnit!);
    } else if (units.length === 1) {
      // Auto-select when there's only one unit
      handleSelectUnit(units[0].id);
    } else {
      return <UnitSelectorModal units={units} onSelect={handleSelectUnit} />;
    }
  }

  return <Outlet />;
}
