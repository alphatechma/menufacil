import { useState } from 'react';
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
} from 'lucide-react';
import { useGetAuditLogsQuery } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

const ACTION_OPTIONS = [
  { value: 'all', label: 'Todas as acoes' },
  { value: 'tenant.create', label: 'Criar tenant' },
  { value: 'tenant.update', label: 'Atualizar tenant' },
  { value: 'tenant.deactivate', label: 'Desativar tenant' },
  { value: 'tenant.activate', label: 'Ativar tenant' },
  { value: 'tenant.delete', label: 'Excluir tenant' },
  { value: 'plan.create', label: 'Criar plano' },
  { value: 'plan.update', label: 'Atualizar plano' },
  { value: 'plan.delete', label: 'Excluir plano' },
  { value: 'module.create', label: 'Criar modulo' },
  { value: 'module.update', label: 'Atualizar modulo' },
  { value: 'module.delete', label: 'Excluir modulo' },
  { value: 'permission.create', label: 'Criar permissao' },
  { value: 'permission.update', label: 'Atualizar permissao' },
  { value: 'permission.delete', label: 'Excluir permissao' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'plan', label: 'Plano' },
  { value: 'module', label: 'Modulo' },
  { value: 'permission', label: 'Permissao' },
];

function getActionBadge(action: string) {
  const actionType = action.split('.').pop() || '';
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    create: { variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15' },
    update: { variant: 'default', className: 'bg-blue-500/15 text-blue-700 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-500/15' },
    delete: { variant: 'destructive', className: '' },
    deactivate: { variant: 'default', className: 'bg-amber-500/15 text-amber-700 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-500/15' },
    activate: { variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15' },
  };
  const config = variants[actionType] || { variant: 'secondary' as const, className: '' };
  return (
    <Badge variant={config.variant} className={config.className}>
      {action}
    </Badge>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [emailSearch, setEmailSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const queryParams: any = { page, limit: 20 };
  if (emailSearch) queryParams.user_email = emailSearch;
  if (actionFilter !== 'all') queryParams.action = actionFilter;
  if (entityFilter !== 'all') queryParams.entity_type = entityFilter;
  if (fromDate) queryParams.from = fromDate;
  if (toDate) queryParams.to = toDate;

  const { data, isLoading } = useGetAuditLogsQuery(queryParams);

  const logs = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const hasActiveFilters = emailSearch || actionFilter !== 'all' || entityFilter !== 'all' || fromDate || toDate;

  const clearFilters = () => {
    setEmailSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Audit Log</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Historico de acoes realizadas no sistema.
            </p>
          </div>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="text-xs">
            {total} registro{total !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Buscar por email..."
                value={emailSearch}
                onChange={(e) => { setEmailSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Acao" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de entidade" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              placeholder="De"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              placeholder="Ate"
            />
          </div>

          {/* Active filter tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[hsl(var(--border))]">
              {emailSearch && (
                <Badge variant="secondary" className="gap-1">
                  Email: {emailSearch}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setEmailSearch('')} />
                </Badge>
              )}
              {actionFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Acao: {actionFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setActionFilter('all')} />
                </Badge>
              )}
              {entityFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Entidade: {entityFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setEntityFilter('all')} />
                </Badge>
              )}
              {fromDate && (
                <Badge variant="secondary" className="gap-1">
                  De: {fromDate}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFromDate('')} />
                </Badge>
              )}
              {toDate && (
                <Badge variant="secondary" className="gap-1">
                  Ate: {toDate}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setToDate('')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                Limpar tudo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[140px]" />
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-5 w-[100px] rounded-full" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Data/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="pr-6">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <>
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                      <TableCell className="pl-6 text-sm whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[hsl(var(--foreground))]">{log.user_email}</span>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">{log.entity_type}</span>
                          {log.entity_name && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{log.entity_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            {expandedRow === log.id ? (
                              <>Ocultar <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Ver <ChevronDown className="w-3 h-3" /></>
                            )}
                          </Button>
                        ) : (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                          {log.ip_address || '\u2014'}
                        </span>
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && log.details && (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={6} className="pl-6 pr-6 bg-[hsl(var(--muted))]">
                          <pre className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap font-mono p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
                <ScrollText className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium mb-1">Nenhum registro encontrado</p>
              <p className="text-xs">Tente ajustar os filtros de busca.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Pagina {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Proximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
