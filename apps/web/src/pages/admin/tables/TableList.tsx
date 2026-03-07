import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Users,
  Printer,
  LayoutGrid,
} from 'lucide-react';
import {
  useGetTablesQuery,
  useDeleteTableMutation,
  useUpdateTableStatusMutation,
} from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { PageHeader } from '@/components/ui/PageHeader';

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'default' }
> = {
  available: { label: 'Disponivel', variant: 'success' },
  occupied: { label: 'Ocupada', variant: 'danger' },
  reserved: { label: 'Reservada', variant: 'warning' },
  maintenance: { label: 'Manutencao', variant: 'default' },
};

export default function TableList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    number: number;
  } | null>(null);
  const [qrTable, setQrTable] = useState<{
    id: string;
    number: number;
  } | null>(null);

  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);

  const { data: tables = [], isLoading } = useGetTablesQuery();
  const [deleteTable, { isLoading: isDeleting }] = useDeleteTableMutation();
  const [updateTableStatus] = useUpdateTableStatusMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return tables;
    const term = search.toLowerCase();
    return tables.filter(
      (table: any) =>
        String(table.number).includes(term) ||
        table.label?.toLowerCase().includes(term),
    );
  }, [tables, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTable(deleteTarget.id).unwrap();
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (table: any) => {
    const newStatus = table.status === 'maintenance' ? 'available' : 'maintenance';
    await updateTableStatus({ id: table.id, status: newStatus }).unwrap();
  };

  const qrUrl = qrTable
    ? `${window.location.origin}/${tenantSlug}/mesa/${qrTable.number}`
    : '';

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Mesa ${qrTable?.number}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; margin: 0; }
            h1 { font-size: 24px; margin-bottom: 16px; }
            p { font-size: 14px; color: #666; margin-top: 12px; }
            img { width: 256px; height: 256px; }
          </style>
        </head>
        <body>
          <h1>Mesa ${qrTable?.number}</h1>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrUrl)}" alt="QR Code" />
          <p>${qrUrl}</p>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Mesas"
        actions={
          <Link to="/admin/tables/new">
            <Button>
              <Plus className="w-4 h-4" />
              Nova Mesa
            </Button>
          </Link>
        }
      />

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar mesas..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="w-12 h-12" />}
          title="Nenhuma mesa encontrada"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Crie sua primeira mesa para comecar a gerenciar o salao.'
          }
          action={
            !search ? (
              <Link to="/admin/tables/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Nova Mesa
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Numero
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Identificacao
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Capacidade
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ativa
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((table: any) => {
                  const status = statusConfig[table.status] ?? statusConfig.available;
                  const isActive = table.is_active !== false;

                  return (
                    <tr
                      key={table.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-foreground">
                          #{table.number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {table.label || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {table.capacity ? (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {table.capacity}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Toggle
                          checked={isActive}
                          onChange={() => handleToggleActive(table)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setQrTable({ id: table.id, number: table.number })
                            }
                            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                            title="QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <Link to={`/admin/tables/${table.id}/edit`}>
                            <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: table.id,
                                number: table.number,
                              })
                            }
                            className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Modal
        open={!!qrTable}
        onClose={() => setQrTable(null)}
        title={`QR Code - Mesa #${qrTable?.number}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrUrl)}`}
              alt={`QR Code Mesa ${qrTable?.number}`}
              className="w-64 h-64"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center break-all">
            {qrUrl}
          </p>
          <Button onClick={handlePrintQr} className="w-full">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Mesa"
        message={`Tem certeza que deseja excluir a mesa #${deleteTarget?.number}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
