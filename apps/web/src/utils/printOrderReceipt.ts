import { printOrder, isAutoPrintEnabled } from './printService';

/**
 * Print an order receipt. Tries QZ Tray (silent ESC/POS) first,
 * falls back to browser print dialog if QZ is not available.
 * Respects the auto-print setting — if disabled, does nothing.
 */
export function printOrderReceipt(order: any, tenantName?: string) {
  if (!isAutoPrintEnabled()) return;
  printOrder(order, tenantName);
}
