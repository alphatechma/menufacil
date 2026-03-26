import { useState, useEffect } from 'react';
import {
  Printer, Search, CheckCircle2, XCircle, Loader2, Clock, Trash2, Zap,
  Usb, AlertTriangle, Wifi, Plus, X, Monitor, Star, ChefHat, Settings2, RefreshCw,
} from 'lucide-react';
import { usePrinter, type PrinterInfo, type QueueJob } from '@/hooks/usePrinter';
import { useNotify } from '@/hooks/useNotify';
import { cn } from '@/utils/cn';

const PAPER_WIDTHS = [
  { value: 80, label: '80mm — PDV padrão', chars: 48 },
  { value: 58, label: '58mm — Compacta', chars: 32 },
  { value: 57, label: '57mm — Maquininha', chars: 30 },
];

const CONN_STYLES: Record<string, { icon: typeof Usb; bg: string; text: string; label: string }> = {
  usb: { icon: Usb, bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'USB' },
  network: { icon: Wifi, bg: 'bg-sky-50', text: 'text-sky-600', label: 'Rede' },
  system: { icon: Monitor, bg: 'bg-violet-50', text: 'text-violet-600', label: 'Sistema' },
};

function StatusBadge({ status }: { status: QueueJob['status'] }) {
  const map = {
    pending: { bg: 'bg-gray-100 text-gray-500', icon: Clock, label: 'Na fila', spin: false },
    printing: { bg: 'bg-blue-50 text-blue-600', icon: Loader2, label: 'Imprimindo', spin: true },
    done: { bg: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2, label: 'Concluído', spin: false },
    error: { bg: 'bg-red-50 text-red-600', icon: XCircle, label: 'Erro', spin: false },
  }[status];
  return (
    <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1', map.bg)}>
      <map.icon className={cn('w-3 h-3', map.spin && 'animate-spin')} />
      {map.label}
    </span>
  );
}

function PrinterName({ name }: { name: string }) {
  // Clean up ugly system names: EPSON_L3250_Series → Epson L3250 Series
  const clean = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <>{clean}</>;
}

export default function PrinterManager() {
  const {
    printers, queue, systemQueue, loading, error,
    listPrinters, testPrint, getPrintQueue, clearPrintQueue,
    addNetworkPrinter, removeNetworkPrinter,
    getSystemQueue, cancelSystemJob,
  } = usePrinter();
  const notify = useNotify();

  const [defaultPrinter, setDefaultPrinter] = useState(() => localStorage.getItem('menufacil_default_printer') || '');
  const [kitchenPrinter, setKitchenPrinter] = useState(() => localStorage.getItem('menufacil_kitchen_printer') || '');
  const [paperWidth, setPaperWidth] = useState(() => parseInt(localStorage.getItem('menufacil_paper_width') || '80'));
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ key: string; success: boolean; message: string } | null>(null);
  const [showNetworkForm, setShowNetworkForm] = useState(false);
  const [networkIp, setNetworkIp] = useState('');
  const [networkPort, setNetworkPort] = useState('9100');
  const [addingNetwork, setAddingNetwork] = useState(false);

  useEffect(() => { getPrintQueue(); }, [getPrintQueue]);

  const handleSetDefault = (key: string) => { setDefaultPrinter(key); localStorage.setItem('menufacil_default_printer', key); notify.success('Impressora padrão definida'); };
  const handleSetKitchen = (key: string) => { setKitchenPrinter(key); localStorage.setItem('menufacil_kitchen_printer', key); notify.success('Impressora da cozinha definida'); };

  const handleTestPrint = async (printerKey: string) => {
    setTestingPrinter(printerKey);
    setTestResult(null);
    try {
      await testPrint(printerKey);
      setTestResult({ key: printerKey, success: true, message: 'Página de teste impressa com sucesso!' });
    } catch (err) {
      setTestResult({ key: printerKey, success: false, message: err instanceof Error ? err.message : String(err) });
    } finally { setTestingPrinter(null); }
  };

  const handleAddNetwork = async () => {
    if (!networkIp.trim() || addingNetwork) return;
    setAddingNetwork(true);
    try {
      await addNetworkPrinter(networkIp.trim(), parseInt(networkPort) || 9100);
      notify.success(`Impressora ${networkIp} adicionada!`);
      setNetworkIp(''); setNetworkPort('9100'); setShowNetworkForm(false);
    } catch (err: any) { notify.error(err?.message || 'Não foi possível conectar'); }
    finally { setAddingNetwork(false); }
  };

  const completedCount = queue.filter((j) => j.status === 'done' || j.status === 'error').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Printer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Impressoras</h3>
            <p className="text-xs text-gray-500">Gerencie impressoras do estabelecimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNetworkForm(!showNetworkForm)}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-600 flex items-center gap-1.5 transition-colors">
            {showNetworkForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showNetworkForm ? 'Cancelar' : 'Adicionar por IP'}
          </button>
          <button onClick={() => listPrinters()} disabled={loading}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Detectar
          </button>
        </div>
      </div>

      {/* Add Network Form */}
      {showNetworkForm && (
        <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-sky-700 mb-3 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Conectar impressora de rede</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">IP da impressora</label>
              <input type="text" value={networkIp} onChange={(e) => setNetworkIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNetwork()} placeholder="192.168.0.100"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div className="w-20">
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Porta</label>
              <input type="text" value={networkPort} onChange={(e) => setNetworkPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNetwork()} placeholder="9100"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <button onClick={handleAddNetwork} disabled={addingNetwork || !networkIp.trim()}
              className="h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
              {addingNetwork ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />} Conectar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Printers List */}
      {printers.length > 0 ? (
        <div className="space-y-3">
          {printers.map((p: PrinterInfo) => {
            const connType = p.connection || (p.key.startsWith('net:') ? 'network' : 'usb');
            const style = CONN_STYLES[connType] || CONN_STYLES.system;
            const ConnIcon = style.icon;
            const isDefault = defaultPrinter === p.key;
            const isKitchen = kitchenPrinter === p.key;

            return (
              <div key={p.key} className={cn(
                'bg-white rounded-2xl border p-4 transition-all duration-200',
                isDefault || isKitchen ? 'border-primary/30 shadow-sm' : 'border-gray-100 hover:border-gray-200',
              )}>
                {/* Top row: icon + name + connection badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', style.bg)}>
                      <ConnIcon className={cn('w-5 h-5', style.text)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900"><PrinterName name={p.name} /></p>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>{style.label}</span>
                      </div>
                      {p.is_default && (
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Impressora padrão do sistema
                        </p>
                      )}
                    </div>
                  </div>
                  {p.key.startsWith('net:') && (
                    <button onClick={() => { removeNetworkPrinter(p.key); notify.info('Impressora removida'); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Role badges + actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isDefault && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Star className="w-3 h-3" /> Impressora Padrão
                    </span>
                  )}
                  {isKitchen && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">
                      <ChefHat className="w-3 h-3" /> Cozinha
                    </span>
                  )}

                  <div className="flex-1" />

                  <button onClick={() => handleSetDefault(p.key)}
                    className={cn('h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                      isDefault ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200')}>
                    <Star className={cn('w-3 h-3', isDefault && 'fill-white')} /> Padrão
                  </button>
                  <button onClick={() => handleSetKitchen(p.key)}
                    className={cn('h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                      isKitchen ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200')}>
                    <ChefHat className={cn('w-3 h-3', isKitchen && 'fill-white')} /> Cozinha
                  </button>
                  <button onClick={() => handleTestPrint(p.key)} disabled={testingPrinter === p.key}
                    className="h-8 px-3 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5 transition-all disabled:opacity-50">
                    {testingPrinter === p.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Teste
                  </button>
                </div>

                {/* Test result inline */}
                {testResult && testResult.key === p.key && (
                  <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                    testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                    {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {testResult.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Printer className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">Nenhuma impressora detectada</p>
          <p className="text-xs text-gray-400 mt-1">Clique em <strong>Detectar</strong> para buscar impressoras</p>
        </div>
      ) : null}

      {/* Settings Row */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Largura do papel</p>
              <p className="text-[11px] text-gray-400">Tamanho da bobina térmica</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {PAPER_WIDTHS.map((pw) => (
              <button key={pw.value} onClick={() => { setPaperWidth(pw.value); localStorage.setItem('menufacil_paper_width', String(pw.value)); }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  paperWidth === pw.value ? 'bg-primary text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200')}>
                {pw.value}mm
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Print Queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Fila de Impressão</p>
            {completedCount > 0 && (
              <button onClick={clearPrintQueue}
                className="text-[11px] font-medium text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {queue.map((job: QueueJob) => (
              <div key={job.id} className="flex items-center justify-between bg-gray-50/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2.5">
                  {job.status === 'pending' && <Clock className="w-3.5 h-3.5 text-gray-400" />}
                  {job.status === 'printing' && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                  {job.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {job.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  <div>
                    <p className="text-xs font-medium text-gray-800">{job.label}</p>
                    {job.error_message && <p className="text-[10px] text-red-500">{job.error_message}</p>}
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Print Queue */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Fila do Sistema</p>
            {systemQueue.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{systemQueue.length}</span>
            )}
          </div>
          <button onClick={() => getSystemQueue()}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>

        {systemQueue.length > 0 ? (
          <div className="space-y-1.5">
            {systemQueue.map((job) => (
              <div key={job.id} className="flex items-center justify-between bg-gray-50/50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{job.id}</p>
                    <p className="text-[10px] text-gray-400">{job.printer} • {job.user} • {job.size} bytes</p>
                  </div>
                </div>
                <button onClick={async () => {
                  try {
                    await cancelSystemJob(job.id);
                    notify.success('Job cancelado');
                  } catch (err: any) { notify.error(err?.message || 'Erro ao cancelar'); }
                }}
                  className="text-[11px] font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Cancelar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">Nenhum trabalho na fila do sistema</p>
        )}
      </div>
    </div>
  );
}
