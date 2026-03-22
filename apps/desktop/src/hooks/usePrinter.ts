import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PrinterInfo {
  name: string;
  key: string;
  vendor_id: number;
  product_id: number;
  manufacturer: string;
  serial: string;
  type: 'usb' | 'network';
}

export interface NetworkPrinterInfo {
  name: string;
  key: string;
  address: string;
  ip: string;
  port: number;
}

export interface QueueJob {
  id: string;
  label: string;
  printer_key: string;
  status: 'pending' | 'printing' | 'done' | 'error';
  retries: number;
  error_message: string | null;
  created_at: string;
}

export function usePrinter() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const listPrinters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usbPrinters = await invoke<PrinterInfo[]>('list_printers');
      const usb = usbPrinters.map((p) => ({ ...p, type: 'usb' as const }));

      // Load saved network printers from localStorage
      const savedNetwork: PrinterInfo[] = JSON.parse(
        localStorage.getItem('menufacil_network_printers') || '[]',
      );

      setPrinters([...usb, ...savedNetwork]);
      return [...usb, ...savedNetwork];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const scanNetworkPrinters = useCallback(async (subnet: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<NetworkPrinterInfo[]>('scan_network_printers', { subnet });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addNetworkPrinter = useCallback(async (ip: string, port: number = 9100) => {
    try {
      const result = await invoke<NetworkPrinterInfo>('add_network_printer', { ip, port });
      const networkPrinter: PrinterInfo = {
        name: result.name,
        key: result.key,
        vendor_id: 0,
        product_id: 0,
        manufacturer: 'Rede',
        serial: result.address,
        type: 'network',
      };

      // Save to localStorage
      const saved: PrinterInfo[] = JSON.parse(
        localStorage.getItem('menufacil_network_printers') || '[]',
      );
      const exists = saved.some((p) => p.key === networkPrinter.key);
      if (!exists) {
        saved.push(networkPrinter);
        localStorage.setItem('menufacil_network_printers', JSON.stringify(saved));
      }

      setPrinters((prev) => {
        const filtered = prev.filter((p) => p.key !== networkPrinter.key);
        return [...filtered, networkPrinter];
      });

      return networkPrinter;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }, []);

  const removeNetworkPrinter = useCallback((key: string) => {
    const saved: PrinterInfo[] = JSON.parse(
      localStorage.getItem('menufacil_network_printers') || '[]',
    );
    const filtered = saved.filter((p) => p.key !== key);
    localStorage.setItem('menufacil_network_printers', JSON.stringify(filtered));
    setPrinters((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const printReceipt = useCallback(
    async (orderJson: string, printerKey: string, tenantName?: string, paperWidth?: number) => {
      try {
        const savedTenantName = tenantName || localStorage.getItem('menufacil_tenant_name') || 'MenuFacil';
        const savedPaperWidth = paperWidth || parseInt(localStorage.getItem('menufacil_paper_width') || '80');

        const jobId = await invoke<string>('print_receipt', {
          orderJson,
          printerKey,
          tenantName: savedTenantName,
          paperWidth: savedPaperWidth,
        });
        // Refresh queue after adding job
        await getPrintQueue();
        return jobId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(msg);
      }
    },
    [],
  );

  const testPrint = useCallback(async (printerKey: string) => {
    try {
      await invoke('test_print', { printerKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }, []);

  const getPrintQueue = useCallback(async () => {
    try {
      const result = await invoke<QueueJob[]>('get_print_queue');
      setQueue(result);
      return result;
    } catch {
      return [];
    }
  }, []);

  const clearPrintQueue = useCallback(async () => {
    try {
      await invoke('clear_print_queue');
      await getPrintQueue();
    } catch {
      // ignore
    }
  }, [getPrintQueue]);

  // Auto-poll queue when there are pending/printing jobs
  useEffect(() => {
    const hasPending = queue.some((j) => j.status === 'pending' || j.status === 'printing');

    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        getPrintQueue();
      }, 2000);
    } else if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [queue, getPrintQueue]);

  return {
    printers,
    queue,
    loading,
    error,
    listPrinters,
    printReceipt,
    testPrint,
    getPrintQueue,
    clearPrintQueue,
    scanNetworkPrinters,
    addNetworkPrinter,
    removeNetworkPrinter,
  };
}
