import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Eye } from 'lucide-react';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
} from '@/api/adminApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPhone } from '@/utils/formatPhone';

export default function CustomerList() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const { data: customers = [], isLoading } = useGetCustomersQuery();
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term),
    );
  }, [customers, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    try {
      await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
      }).unwrap();

      setShowModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
    } catch {
      // Error handled by RTK Query
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, telefone ou email..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="Nenhum cliente encontrado"
          description={
            search
              ? 'Tente buscar com outros termos.'
              : 'Cadastre seu primeiro cliente.'
          }
          action={
            !search ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pontos Fidelidade
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Data Cadastro
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {customer.phone ? formatPhone(customer.phone) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {customer.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {customer.loyalty_points || 0} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link to={`/admin/customers/${customer.id}`}>
                          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Telefone <span className="text-red-500">*</span>
            </label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isCreating}
              disabled={!newName.trim() || !newPhone.trim()}
            >
              <Plus className="w-4 h-4" />
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
