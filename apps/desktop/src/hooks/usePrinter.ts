import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PrinterInfo {
  name: string;
  key: string;
  connection: string; // 'usb' | 'network' | 'system'
  address: string;
  manufacturer: string;
  serial: string;
  is_default: boolean;
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
      const result = await invoke<PrinterInfo[]>('list_printers');

      // Merge with saved manual network printers
      const savedNetwork: PrinterInfo[] = JSON.parse(
        localStorage.getItem('menufacil_network_printers') || '[]',
      );
      const allKeys = new Set(result.map((p) => p.key));
      const extra = savedNetwork.filter((p) => !allKeys.has(p.key));

      const all = [...result, ...extra];
      setPrinters(all);
      return all;
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
      const result = await invoke<PrinterInfo>('add_network_printer', { ip, port });

      // Save to localStorage
      const saved: PrinterInfo[] = JSON.parse(
        localStorage.getItem('menufacil_network_printers') || '[]',
      );
      if (!saved.some((p) => p.key === result.key)) {
        saved.push(result);
        localStorage.setItem('menufacil_network_printers', JSON.stringify(saved));
      }

      setPrinters((prev) => {
        const filtered = prev.filter((p) => p.key !== result.key);
        return [...filtered, result];
      });

      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const removeNetworkPrinter = useCallback((key: string) => {
    const saved: PrinterInfo[] = JSON.parse(
      localStorage.getItem('menufacil_network_printers') || '[]',
    );
    localStorage.setItem(
      'menufacil_network_printers',
      JSON.stringify(saved.filter((p) => p.key !== key)),
    );
    setPrinters((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const printReceipt = useCallback(
    async (orderJson: string, printerKey: string, tenantName?: string, paperWidth?: number) => {
      try {
        const savedTenantName = tenantName || localStorage.getItem('menufacil_tenant_name') || 'MenuFácil';
        const savedPaperWidth = paperWidth || parseInt(localStorage.getItem('menufacil_paper_width') || '80');

        const jobId = await invoke<string>('print_receipt', {
          orderJson,
          printerKey,
          tenantName: savedTenantName,
          paperWidth: savedPaperWidth,
        });
        await getPrintQueue();
        return jobId;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const testPrint = useCallback(async (printerKey: string) => {
    try {
      await invoke('test_print', { printerKey });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
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
    } catch { /* ignore */ }
  }, [getPrintQueue]);

  // Auto-poll queue
  useEffect(() => {
    const hasPending = queue.some((j) => j.status === 'pending' || j.status === 'printing');
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(() => getPrintQueue(), 2000);
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
    addNetworkPrinter,
    removeNetworkPrinter,
  };
}
