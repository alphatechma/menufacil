import { useEffect } from 'react';
import type { Tenant } from '@/store/slices/tenantSlice';

export function applyBranding(tenant: Tenant) {
  const root = document.documentElement;
  const color = tenant.primary_color || '#FF6B35';

  root.style.setProperty('--tenant-primary', color);

  const darken = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const lighten = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
    const b = Math.min(255, (num & 0x0000ff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  root.style.setProperty('--tenant-primary-dark', darken(color, 20));
  root.style.setProperty('--tenant-primary-light', lighten(color, 40));
}

export function useTenantBranding(tenant: Tenant | null) {
  useEffect(() => {
    if (tenant) {
      applyBranding(tenant);
    }
  }, [tenant]);
}
