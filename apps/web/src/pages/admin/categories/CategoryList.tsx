import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderTree, Eye, EyeOff } from 'lucide-react';
import { useGetCategoriesQuery, useDeleteCategoryMutation } from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function CategoryList() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter(
      (cat: any) =>
        cat.name?.toLowerCase().includes(term) ||
        cat.description?.toLowerCase().includes(term),
    );
  }, [categories, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id).unwrap();
      toast.success('Categoria excluida com sucesso!');
    } catch {
      toast.error('Erro ao excluir categoria.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
        <Link to="/admin/categories/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar categorias..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="w-12 h-12" />}
          title="Nenhuma categoria encontrada"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Crie sua primeira categoria para organizar seus produtos.'
          }
          action={
            !search ? (
              <Link to="/admin/categories/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Nova Categoria
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
                    Categoria
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Descricao
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((cat: any) => (
                  <tr key={cat.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FolderTree className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-foreground">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {cat.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{cat.sort_order}</td>
                    <td className="px-6 py-4">
                      {cat.is_active ? (
                        <Badge variant="success">
                          <Eye className="w-3 h-3 mr-1" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inativa
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/categories/${cat.id}/edit`}>
                          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
      />
    </div>
  );
}
