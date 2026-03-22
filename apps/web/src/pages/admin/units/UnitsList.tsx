import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useGetUnitsQuery, useDeleteUnitMutation } from '@/api/adminApi';

export default function UnitsList() {
  const navigate = useNavigate();
  const { data: units, isLoading } = useGetUnitsQuery();
  const [deleteUnit] = useDeleteUnitMutation();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (unit: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-medium">{unit.name}</span>
          {unit.is_headquarters && (
            <Badge variant="info">Matriz</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (unit: any) => (
        <span className="text-muted-foreground font-mono text-xs">{unit.slug}</span>
      ),
    },
    {
      key: 'address',
      header: 'Endereço',
      render: (unit: any) => unit.address || '-',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (unit: any) => (
        <Badge variant={unit.is_active ? 'success' : 'danger'}>
          {unit.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (unit: any) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/units/${unit.id}`)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(unit.id)}>
            <Trash2 className="w-4 h-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Unidades"
        actions={
          <Button onClick={() => navigate('/admin/units/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Unidade
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : !units?.length ? (
          <EmptyState
            title="Nenhuma unidade"
            description="Crie sua primeira unidade para gerenciar multiplas filiais."
          />
        ) : (
          <Table data={units} columns={columns} keyExtractor={(u: any) => u.id} />
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deleteUnit(deleteId);
          setDeleteId(null);
        }}
        title="Desativar unidade"
        message="Tem certeza que deseja desativar esta unidade? Ela podera ser reativada depois."
      />
    </>
  );
}
