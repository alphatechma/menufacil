import { RefreshCw, Wifi, WifiOff, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SyncStatus } from '@/hooks/useOfflineCache';

interface SyncIndicatorProps {
  syncStatus: SyncStatus;
  pendingOrdersCount: number;
  lastSyncTime: string | null;
  onSync: () => void;
  onSyncOrders: () => void;
  isSyncingOrders: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, { color: string; bgColor: string; label: string; icon: typeof Wifi }> = {
  synced: { color: 'text-green-600', bgColor: 'bg-green-500', label: 'Sincronizado', icon: Wifi },
  syncing: { color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: 'Sincronizando...', icon: RefreshCw },
  offline: { color: 'text-red-600', bgColor: 'bg-red-500', label: 'Offline', icon: WifiOff },
  error: { color: 'text-red-600', bgColor: 'bg-red-500', label: 'Erro de sync', icon: CloudOff },
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Nunca';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atras`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atras`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function SyncIndicator({
  syncStatus,
  pendingOrdersCount,
  lastSyncTime,
  onSync,
  onSyncOrders,
  isSyncingOrders,
}: SyncIndicatorProps) {
  const config = STATUS_CONFIG[syncStatus];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Pending orders badge */}
      {pendingOrdersCount > 0 && (
        <button
          onClick={onSyncOrders}
          disabled={isSyncingOrders}
          className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          title="Sincronizar pedidos pendentes"
        >
          {isSyncingOrders ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CloudOff className="h-3 w-3" />
          )}
          {pendingOrdersCount} pendente{pendingOrdersCount !== 1 ? 's' : ''}
        </button>
      )}

      {/* Sync status */}
      <button
        onClick={onSync}
        disabled={syncStatus === 'syncing'}
        className={cn(
          'group relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
          syncStatus === 'synced' && 'text-gray-500 hover:bg-gray-100',
          syncStatus === 'syncing' && 'text-yellow-600 bg-yellow-50',
          syncStatus === 'offline' && 'text-red-600 bg-red-50 hover:bg-red-100',
          syncStatus === 'error' && 'text-red-600 bg-red-50 hover:bg-red-100',
        )}
        title={`Último sync: ${formatSyncTime(lastSyncTime)}`}
      >
        <span className={cn('h-2 w-2 rounded-full', config.bgColor)} />
        <Icon className={cn('h-3 w-3', syncStatus === 'syncing' && 'animate-spin')} />

        {/* Tooltip */}
        <span className="pointer-events-none absolute top-full right-0 mt-2 z-50 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {config.label} - {formatSyncTime(lastSyncTime)}
        </span>
      </button>
    </div>
  );
}
