import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { cn } from '../utils/cn';

interface Table {
  id: string;
  number: number;
  label?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  active_orders_count?: number;
}

const statusConfig: Record<string, { bg: string; ring: string; label: string }> = {
  available: { bg: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-500', label: 'Livre' },
  occupied: { bg: 'bg-red-100 text-red-800', ring: 'ring-red-500', label: 'Ocupada' },
  reserved: { bg: 'bg-amber-100 text-amber-800', ring: 'ring-amber-500', label: 'Reservada' },
  maintenance: { bg: 'bg-gray-200 text-gray-600', ring: 'ring-gray-400', label: 'Manutencao' },
};

export default function Tables() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data);
    } catch {
      // silently fail, will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  useSocket({
    'table:status-updated': () => fetchTables(),
    'order:created': () => fetchTables(),
    'order:updated': () => fetchTables(),
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mesas</h1>
            <p className="text-xs text-gray-500">{user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchTables(); }}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 overflow-x-auto text-xs">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <span key={key} className={cn('px-2 py-1 rounded-full whitespace-nowrap font-medium', cfg.bg)}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {tables.map((table) => {
          const cfg = statusConfig[table.status] || statusConfig.available;
          return (
            <button
              key={table.id}
              onClick={() => navigate(`/tables/${table.id}`)}
              className={cn(
                'relative bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent',
                'hover:shadow-md transition-all active:scale-95',
                `ring-2 ${cfg.ring} ring-inset`,
              )}
            >
              <div className="text-center">
                <span className="text-2xl font-bold text-gray-900">{table.number}</span>
                {table.label && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{table.label}</p>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{table.capacity}</span>
              </div>
              <div className="mt-2 flex justify-center">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.bg)}>
                  {cfg.label}
                </span>
              </div>
              {table.status === 'occupied' && table.active_orders_count && table.active_orders_count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {table.active_orders_count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!loading && tables.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nenhuma mesa encontrada</p>
        </div>
      )}
    </div>
  );
}
