import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Building2 } from 'lucide-react';
import { useGetTenantsQuery } from '@/api/superAdminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export default function TenantList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useGetTenantsQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const tenants = Array.isArray(data) ? data : (data as any)?.data ?? [];

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
        <Button asChild>
          <Link to="/tenants/new">
            <Plus className="h-4 w-4" />
            Novo Tenant
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  <TableHead className="pl-6">Tenant</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant: any) => (
                  <TableRow key={tenant.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))]">{tenant.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.plan ? (
                        <Badge variant="secondary">{tenant.plan.name}</Badge>
                      ) : (
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tenant.is_active ? 'default' : 'destructive'}
                        className={tenant.is_active
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-500/15'
                          : ''}
                      >
                        {tenant.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/tenants/${tenant.id}`}>
                          <Eye className="h-4 w-4" />
                          Ver
                        </Link>
                      </Button>
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
    </div>
  );
}
