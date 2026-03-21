import { Printer, Settings, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrinterManager() {
  const navigate = useNavigate();

  const paperWidth = (() => {
    try {
      return localStorage.getItem('menufacil_desktop_paper_width') || '80';
    } catch {
      return '80';
    }
  })();

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Printer className="w-8 h-8 text-gray-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">Impressao Nativa</h2>
        <p className="text-sm text-gray-500 mb-6">
          Impressao nativa via USB sera disponibilizada em breve.
        </p>

        {/* Current Paper Width */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Printer className="w-4 h-4 text-gray-400" />
            <span>Largura do papel atual:</span>
            <span className="font-bold text-gray-900">{paperWidth}mm</span>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">Impressao via navegador</p>
            <p className="text-xs text-blue-600">
              Por enquanto, utilize o QZ Tray via navegador para impressao.
              Acesse o painel web para configurar a impressora termica.
            </p>
          </div>
        </div>

        {/* Link to Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors active:scale-95"
        >
          <Settings className="w-4 h-4" />
          Ir para Configuracoes
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
