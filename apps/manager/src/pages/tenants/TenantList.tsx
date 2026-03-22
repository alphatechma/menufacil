import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Building2,
  Phone,
  MapPin,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Power,
  PowerOff,
  ArrowRightLeft,
  ArrowUpDown,
  X,
  CalendarDays,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetTenantsQuery,
  useRestoreTenantMutation,
  useBulkUpdateTenantsMutation,
  useGetPlansQuery,
} from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const ITEMS_PER_PAGE = 20;

function exportTenantsCSV(tenants: any[]) {
  const BOM = '\uFEFF';
  const headers = ['Nome', 'Slug', 'Telefone', 'Endereco', 'Plano', 'Status', 'Data de Criacao'];
  const rows = tenants.map((t) => [
    t.name || '',
    t.slug || '',
    t.phone || '',
    (t.address || '').replace(/"/g, '""'),
    t.plan?.name || 'Sem Plano',
    t.is_active ? 'Ativo' : 'Inativo',
    t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '',
  ]);

  const csvContent = BOM + [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tenants-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function TenantList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'change_plan';
  }>({ open: false, action: 'activate' });
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const isDeleted = statusFilter === 'deleted';

  const hasActiveFilters = planFilter !== 'all' || fromDate || toDate || sortBy !== 'newest';

  const { data, isLoading } = useGetTenantsQuery({
    search: search || undefined,
    is_active: !isDeleted && statusFilter !== 'all' ? statusFilter : undefined,
    deleted: isDeleted ? 'true' : undefined,
    plan_id: planFilter !== 'all' ? planFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    sort: sortBy !== 'newest' ? sortBy : undefined,
    page,
    limit: ITEMS_PER_PAGE,
  } as any);

  const [restoreTenant] = useRestoreTenantMutation();
  const [bulkUpdate, { isLoading: isBulkLoading }] = useBulkUpdateTenantsMutation();
  const { data: plans } = useGetPlansQuery();

  const tenants = useMemo(() => {
    if (Array.isArray(data)) return data;
    return (data as any)?.data ?? [];
  }, [data]);

  const totalItems = (data as any)?.total ?? tenants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const handleRestore = async (id: string, name: string) => {
    try {
      await restoreTenant(id).unwrap();
      toast.success(`"${name}" restaurado com sucesso!`);
    } catch {
      toast.error('Erro ao restaurar tenant.');
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === tenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map((t: any) => t.id)));
    }
  }, [tenants, selectedIds.size]);

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate({
        action: bulkDialog.action,
        ids: Array.from(selectedIds),
        ...(bulkDialog.action === 'change_plan' && selectedPlanId ? { planId: selectedPlanId } : {}),
      }).unwrap();
      const actionLabel =
        bulkDialog.action === 'activate' ? 'ativados' :
        bulkDialog.action === 'deactivate' ? 'desativados' :
        'plano alterado';
      toast.success(`${selectedIds.size} tenant(s) ${actionLabel} com sucesso!`);
      setSelectedIds(new Set());
      setBulkDialog({ open: false, action: 'activate' });
      setSelectedPlanId('');
    } catch {
      toast.error('Erro ao executar acao em lote.');
    }
  };

  const openBulkDialog = (action: 'activate' | 'deactivate' | 'change_plan') => {
    setBulkDialog({ open: true, action });
  };

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handlePlanFilterChange = (value: string) => {
    setPlanFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPlanFilter('all');
    setFromDate('');
    setToDate('');
    setSortBy('newest');
    setPage(1);
    setSelectedIds(new Set());
  };

  const plansList = Array.isArray(plans) ? plans : [];

  const dialogTitle =
    bulkDialog.action === 'activate' ? 'Ativar Tenants' :
    bulkDialog.action === 'deactivate' ? 'Desativar Tenants' :
    'Alterar Plano';

  const dialogDescription =
    bulkDialog.action === 'activate'
      ? `Tem certeza que deseja ativar ${selectedIds.size} tenant(s)?`
      : bulkDialog.action === 'deactivate'
      ? `Tem certeza que deseja desativar ${selectedIds.size} tenant(s)?`
      : `Selecione o plano para aplicar a ${selectedIds.size} tenant(s):`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Tenants</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Gerencie os estabelecimentos da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTenantsCSV(tenants)}
            disabled={tenants.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button asChild>
            <Link to="/tenants/new">
              <Plus className="h-4 w-4" />
              Novo Tenant
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Buscar por nome ou slug..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
                <SelectItem value="deleted">Excluidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={handlePlanFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {plansList.map((plan: any) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              placeholder="De"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              placeholder="Ate"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Ordenar:</span>
            </div>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="name_asc">Nome A-Z</SelectItem>
                <SelectItem value="name_desc">Nome Z-A</SelectItem>
                <SelectItem value="most_revenue">Maior receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
              {planFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CreditCard className="w-3 h-3" />
                  Plano: {plansList.find((p: any) => p.id === planFilter)?.name || planFilter}
                  <X className="w-3 h-3 cursor-pointer ml-0.5" onClick={() => setPlanFilter('all')} />
                </Badge>
              )}
              {fromDate && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CalendarDays className="w-3 h-3" />
                  De: {fromDate}
                  <X className="w-3 h-3 cursor-pointer ml-0.5" onClick={() => setFromDate('')} />
                </Badge>
              )}
              {toDate && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CalendarDays className="w-3 h-3" />
                  Ate: {toDate}
                  <X className="w-3 h-3 cursor-pointer ml-0.5" onClick={() => setToDate('')} />
                </Badge>
              )}
              {sortBy !== 'newest' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <ArrowUpDown className="w-3 h-3" />
                  Ordem: {
                    { oldest: 'Mais antigos', name_asc: 'Nome A-Z', name_desc: 'Nome Z-A', most_revenue: 'Maior receita' }[sortBy]
                  }
                  <X className="w-3 h-3 cursor-pointer ml-0.5" onClick={() => setSortBy('newest')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7 ml-auto">
                Limpar tudo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && !isDeleted && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in">
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
            {selectedIds.size} tenant(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => openBulkDialog('activate')}>
              <Power className="h-4 w-4" />
              Ativar
            </Button>
            <Button variant="outline" size="sm" onClick={() => openBulkDialog('deactivate')}>
              <PowerOff className="h-4 w-4" />
              Desativar
            </Button>
            <Button variant="outline" size="sm" onClick={() => openBulkDialog('change_plan')}>
              <ArrowRightLeft className="h-4 w-4" />
              Alterar Plano
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                  <Skeleton className="h-5 w-[80px] rounded-full" />
                  <Skeleton className="h-5 w-[60px] rounded-full" />
                  <Skeleton className="h-8 w-[60px]" />
                </div>
              ))}
            </div>
          ) : tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {!isDeleted && (
                    <TableHead className="pl-4 w-[40px]">
                      <Checkbox
                        checked={selectedIds.size === tenants.length && tenants.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className={isDeleted ? 'pl-6' : ''}>Tenant</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant: any) => (
                  <TableRow key={tenant.id} className={selectedIds.has(tenant.id) ? 'bg-primary/5' : ''}>
                    {!isDeleted && (
                      <TableCell className="pl-4 w-[40px]">
                        <Checkbox
                          checked={selectedIds.has(tenant.id)}
                          onCheckedChange={() => toggleSelect(tenant.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={isDeleted ? 'pl-6' : ''}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {tenant.phone ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{tenant.phone}</span>
                          </div>
                        ) : null}
                        {tenant.address ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{tenant.address}</span>
                          </div>
                        ) : null}
                        {!tenant.phone && !tenant.address && (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.plan ? (
                        <div>
                          <Badge variant="secondary">{tenant.plan.name}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            R$ {Number(tenant.plan.price).toFixed(2)}/mes
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isDeleted ? (
                        <Badge variant="destructive">Excluido</Badge>
                      ) : (
                        <Badge
                          variant={tenant.is_active ? 'default' : 'destructive'}
                          className={tenant.is_active
                            ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15'
                            : ''}
                        >
                          {tenant.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {isDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(tenant.id, tenant.name)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restaurar
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/tenants/${tenant.id}`}>
                            <Eye className="h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium mb-1">Nenhum tenant encontrado</p>
              <p className="text-xs">Tente ajustar os filtros ou crie um novo tenant.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Pagina {page} de {totalPages} ({totalItems} tenants)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { setPage((p) => p - 1); setSelectedIds(new Set()); }}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => p + 1); setSelectedIds(new Set()); }}
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={bulkDialog.open} onOpenChange={(open) => setBulkDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {bulkDialog.action === 'change_plan' && (
            <div className="py-4">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan: any) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {Number(plan.price).toFixed(2)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBulkDialog({ open: false, action: 'activate' }); setSelectedPlanId(''); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={isBulkLoading || (bulkDialog.action === 'change_plan' && !selectedPlanId)}
              variant={bulkDialog.action === 'deactivate' ? 'destructive' : 'default'}
            >
              {isBulkLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
