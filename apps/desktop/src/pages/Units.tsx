import { Ruler } from 'lucide-react';
import { useGetUnitsQuery } from '@/api/api';

export default function Units() {
  const { data: units = [], isLoading } = useGetUnitsQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-3 mb-4">
        <Ruler className="w-6 h-6 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Unidades de Medida</h1>
        <span className="text-sm text-gray-500">{units.length} unidade(s)</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        {units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Ruler className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma unidade cadastrada</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">Unidades de medida aparecerao aqui</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Abreviacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{u.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {u.abbreviation}
                    </span>
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
