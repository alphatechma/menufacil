import { useEffect } from 'react';
import type { Tenant } from '@/store/slices/tenantSlice';

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

function buildGradient(colors: string[]): string {
  if (colors.length === 1) return colors[0];
  if (colors.length === 2) return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
}

export function applyBranding(tenant: Tenant) {
  const root = document.documentElement;
  const primary = tenant.primary_color || '#FF6B35';

  root.style.setProperty('--tenant-primary', primary);
  root.style.setProperty('--tenant-primary-dark', darken(primary, 20));
  root.style.setProperty('--tenant-primary-light', lighten(primary, 40));

  const colors = [primary];
  if (tenant.secondary_color) colors.push(tenant.secondary_color);
  if (tenant.accent_color) colors.push(tenant.accent_color);

  root.style.setProperty('--tenant-gradient', buildGradient(colors));
  root.style.setProperty('--tenant-color-count', String(colors.length));

  if (tenant.secondary_color) {
    root.style.setProperty('--tenant-secondary', tenant.secondary_color);
  } else {
    root.style.removeProperty('--tenant-secondary');
  }

  if (tenant.accent_color) {
    root.style.setProperty('--tenant-accent', tenant.accent_color);
  } else {
    root.style.removeProperty('--tenant-accent');
  }
}

export function useTenantBranding(tenant: Tenant | null) {
  useEffect(() => {
    if (tenant) {
      applyBranding(tenant);
    }
  }, [tenant]);
}
