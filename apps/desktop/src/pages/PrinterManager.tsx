import { useState, useEffect } from 'react';
import {
  Printer, Search, CheckCircle2, XCircle, Loader2, Clock, Trash2, Zap,
  Usb, AlertTriangle,
} from 'lucide-react';
import { usePrinter, type PrinterInfo, type QueueJob } from '@/hooks/usePrinter';
import { cn } from '@/utils/cn';

const PAPER_WIDTHS = [
  { value: 80, label: '80mm (PDV)', chars: 48 },
  { value: 58, label: '58mm (compacta)', chars: 32 },
  { value: 57, label: '57mm (maquininha)', chars: 30 },
];

function StatusBadge({ status }: { status: QueueJob['status'] }) {
  const config = {
    pending: { bg: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Na fila' },
    printing: { bg: 'bg-blue-100 text-blue-600', icon: Loader2, label: 'Imprimindo' },
    done: { bg: 'bg-green-100 text-green-600', icon: CheckCircle2, label: 'Concluído' },
    error: { bg: 'bg-red-100 text-red-600', icon: XCircle, label: 'Erro' },
  }[status];

  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', config.bg)}>
      <config.icon className={cn('w-3 h-3', status === 'printing' && 'animate-spin')} />
      {config.label}
    </span>
  );
}

export default function PrinterManager() {
  const {
    printers, queue, loading, error,
    listPrinters, testPrint, getPrintQueue, clearPrintQueue,
  } = usePrinter();

  const [defaultPrinter, setDefaultPrinter] = useState(() =>
    localStorage.getItem('menufacil_default_printer') || '',
  );
  const [kitchenPrinter, setKitchenPrinter] = useState(() =>
    localStorage.getItem('menufacil_kitchen_printer') || '',
  );
  const [paperWidth, setPaperWidth] = useState(() =>
    parseInt(localStorage.getItem('menufacil_paper_width') || '80'),
  );
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ key: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    getPrintQueue();
  }, [getPrintQueue]);

  const handleDetect = async () => {
    await listPrinters();
  };

  const handleSetDefault = (key: string) => {
    setDefaultPrinter(key);
    localStorage.setItem('menufacil_default_printer', key);
  };

  const handleSetKitchen = (key: string) => {
    setKitchenPrinter(key);
    localStorage.setItem('menufacil_kitchen_printer', key);
  };

  const handleTestPrint = async (printerKey: string) => {
    setTestingPrinter(printerKey);
    setTestResult(null);
    try {
      await testPrint(printerKey);
      setTestResult({ key: printerKey, success: true, message: 'Teste impresso com sucesso!' });
    } catch (err) {
      setTestResult({
        key: printerKey,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestingPrinter(null);
    }
  };

  const handlePaperWidth = (value: number) => {
    setPaperWidth(value);
    localStorage.setItem('menufacil_paper_width', String(value));
  };

  const completedCount = queue.filter((j) => j.status === 'done' || j.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Detect Printers */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Impressoras USB</h4>
            <p className="text-xs text-gray-500">Detecte impressoras térmicas conectadas via USB</p>
          </div>
          <button
            onClick={handleDetect}
            disabled={loading}
            className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors active:scale-95"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Detectando...</>
            ) : (
              <><Search className="w-4 h-4" /> Detectar Impressoras</>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {printers.length > 0 && (
          <div className="space-y-2">
            {printers.map((p: PrinterInfo) => (
              <div
                key={p.key}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Usb className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {p.key}
                      {p.serial && ` | SN: ${p.serial}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {defaultPrinter === p.key && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Padrão
                    </span>
                  )}
                  {kitchenPrinter === p.key && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Cozinha
                    </span>
                  )}
                  <button
                    onClick={() => handleSetDefault(p.key)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                      defaultPrinter === p.key
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    Padrão
                  </button>
                  <button
                    onClick={() => handleSetKitchen(p.key)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                      kitchenPrinter === p.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    Cozinha
                  </button>
                  <button
                    onClick={() => handleTestPrint(p.key)}
                    disabled={testingPrinter === p.key}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {testingPrinter === p.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Teste
                  </button>
                </div>
              </div>
            ))}
            {testResult && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm',
                  testResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700',
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        )}

        {!loading && printers.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Printer className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma impressora detectada</p>
            <p className="text-xs mt-1">Conecte uma impressora USB e clique em Detectar</p>
          </div>
        )}
      </div>

      {/* Paper Width */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Largura do papel</p>
            <p className="text-xs text-gray-500">Tamanho da bobina térmica</p>
          </div>
          <select
            value={paperWidth}
            onChange={(e) => handlePaperWidth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {PAPER_WIDTHS.map((pw) => (
              <option key={pw.value} value={pw.value}>
                {pw.label} ({pw.chars} cols)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Print Queue */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Fila de Impressão</h4>
            <p className="text-xs text-gray-500">Trabalhos de impressão recentes</p>
          </div>
          {completedCount > 0 && (
            <button
              onClick={clearPrintQueue}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Limpar concluídos
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Printer className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma impressão na fila</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((job: QueueJob) => (
              <div
                key={job.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  {job.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                  {job.status === 'printing' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {job.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.label}</p>
                    <p className="text-[10px] text-gray-400">
                      {job.created_at}
                      {job.retries > 0 && ` | ${job.retries} tentativa(s)`}
                      {job.error_message && ` | ${job.error_message}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
