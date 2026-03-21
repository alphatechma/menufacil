import { useState, useMemo } from 'react';
import { Users, Search, Star } from 'lucide-react';
import { useGetCustomersQuery } from '@/api/api';

export default function Customers() {
  const { data: customers = [], isLoading } = useGetCustomersQuery();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const lower = search.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(lower) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(lower),
    );
  }, [customers, search]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <span className="text-sm text-gray-500">{customers.length} cliente(s)</span>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fidelidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                        {c.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{c.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-orange-600 font-medium">
                      <Star className="w-3.5 h-3.5" />
                      {c.loyalty_points || 0}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
