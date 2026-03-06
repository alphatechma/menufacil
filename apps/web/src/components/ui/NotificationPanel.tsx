import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Truck, CheckCircle, Bell, X, Clock } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectToasts, removeToast, clearToasts, type OrderNotification } from '@/store/slices/notificationSlice';
import { formatDistanceToNow } from '@/utils/formatTime';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  new_order: { icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary-50' },
  out_for_delivery: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  default: { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
};

function getIcon(notif: OrderNotification) {
  if (notif.type === 'new_order') return ICON_MAP.new_order;
  if (notif.status === 'out_for_delivery') return ICON_MAP.out_for_delivery;
  if (notif.status === 'delivered') return ICON_MAP.delivered;
  return ICON_MAP.default;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const panelRef = useRef<HTMLDivElement>(null);
  const notifications = useAppSelector(selectToasts);

  // Sorted most recent first
  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Notificacoes</h3>
        {sorted.length > 0 && (
          <button
            onClick={() => dispatch(clearToasts())}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bell className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma notificacao</p>
            <p className="text-xs text-gray-300 mt-0.5">Novos pedidos aparecerão aqui</p>
          </div>
        ) : (
          sorted.map((notif) => {
            const iconConfig = getIcon(notif);
            const Icon = iconConfig.icon;

            return (
              <button
                key={notif.id}
                onClick={() => {
                  navigate(`/admin/orders`);
                  onClose();
                }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
              >
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${iconConfig.bg}`}>
                  <Icon className={`w-4 h-4 ${iconConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                  <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-[10px] text-gray-400">{formatDistanceToNow(notif.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(removeToast(notif.id));
                  }}
                  className="shrink-0 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
