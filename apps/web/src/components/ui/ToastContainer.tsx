import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Truck, CheckCircle, Bell, ArrowRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectToasts, removeToast, type OrderNotification } from '@/store/slices/notificationSlice';

const STATUS_CONFIG: Record<string, { icon: typeof Bell; bg: string; border: string; iconColor: string; accent: string }> = {
  new_order: { icon: ShoppingCart, bg: 'bg-primary-50', border: 'border-primary-200', iconColor: 'text-primary', accent: 'bg-primary' },
  out_for_delivery: { icon: Truck, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600', accent: 'bg-blue-500' },
  delivered: { icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-200', iconColor: 'text-green-600', accent: 'bg-green-500' },
  status_update: { icon: Bell, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600', accent: 'bg-amber-500' },
};

function getConfig(toast: OrderNotification) {
  if (toast.type === 'new_order') return STATUS_CONFIG.new_order;
  if (toast.status === 'out_for_delivery') return STATUS_CONFIG.out_for_delivery;
  if (toast.status === 'delivered') return STATUS_CONFIG.delivered;
  return STATUS_CONFIG.status_update;
}

export default function ToastContainer() {
  const toasts = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
      {toasts.slice(-3).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dispatch(removeToast(toast.id))}
          onClick={() => {
            navigate('/admin/orders');
            dispatch(removeToast(toast.id));
          }}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
  onClick,
}: {
  toast: OrderNotification;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const config = getConfig(toast);
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-stretch rounded-xl border ${config.bg} ${config.border} shadow-lg animate-slide-in-right overflow-hidden cursor-pointer group`}
      onClick={onClick}
    >
      {/* Accent bar */}
      <div className={`w-1 shrink-0 ${config.accent}`} />

      <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
        <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 truncate">{toast.message}</p>
          <div className="flex items-center gap-1 mt-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-primary)' }}>
            <span>Ver pedido</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
