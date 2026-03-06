import { printOrder } from './printService';

/**
 * Print an order receipt. Tries QZ Tray (silent ESC/POS) first,
 * falls back to browser print dialog if QZ is not available.
 */
export function printOrderReceipt(order: any, tenantName?: string) {
  printOrder(order, tenantName);
}
