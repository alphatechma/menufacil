import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  UserPlus,
  UserX,
  Truck,
  Store,
  UtensilsCrossed,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import type { CartItem } from './types';

const ORDER_TYPE_ICONS = {
  delivery: Truck,
  pickup: Store,
  dine_in: UtensilsCrossed,
} as const;

const ORDER_TYPE_LABELS = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  dine_in: 'Mesa',
} as const;

interface CartProps {
  cart: CartItem[];
  orderType: string;
  onOrderTypeChange: (type: string) => void;
  selectedTableId: string;
  onTableChange: (id: string) => void;
  tables: any[];
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  onClearCustomer: () => void;
  showCustomerSearch: boolean;
  onShowCustomerSearch: (show: boolean) => void;
  customerSearch: string;
  onCustomerSearchChange: (search: string) => void;
  filteredCustomers: any[];
  showNewCustomer: boolean;
  onShowNewCustomer: (show: boolean) => void;
  newCustomerName: string;
  onNewCustomerNameChange: (name: string) => void;
  newCustomerPhone: string;
  onNewCustomerPhoneChange: (phone: string) => void;
  creatingCustomer: boolean;
  onCreateCustomer: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  subtotal: number;
  total: number;
  itemCount: number;
  children?: React.ReactNode; // Payment section slot
}

export default function Cart({
  cart,
  orderType,
  onOrderTypeChange,
  selectedTableId,
  onTableChange,
  tables,
  deliveryNotes,
  onDeliveryNotesChange,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  showCustomerSearch,
  onShowCustomerSearch,
  customerSearch,
  onCustomerSearchChange,
  filteredCustomers,
  showNewCustomer,
  onShowNewCustomer,
  newCustomerName,
  onNewCustomerNameChange,
  newCustomerPhone,
  onNewCustomerPhoneChange,
  creatingCustomer,
  onCreateCustomer,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  total,
  itemCount,
  children,
}: CartProps) {
  return (
    <div className="w-[420px] flex flex-col bg-white border-l border-gray-100">
      <div className="flex-1 overflow-y-auto">
        {/* Order Type Selector */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tipo do Pedido
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['delivery', 'pickup', 'dine_in'] as const).map((type) => {
              const Icon = ORDER_TYPE_ICONS[type];
              const label = ORDER_TYPE_LABELS[type];
              return (
                <button
                  key={type}
                  onClick={() => onOrderTypeChange(type)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95',
                    orderType === type
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {orderType === 'delivery' && (
            <textarea
              value={deliveryNotes}
              onChange={(e) => onDeliveryNotesChange(e.target.value)}
              placeholder="Endereço / referência..."
              rows={2}
              className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          )}

          {orderType === 'dine_in' && (
            <select
              value={selectedTableId}
              onChange={(e) => onTableChange(e.target.value)}
              className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Selecionar mesa...</option>
              {tables
                .filter((t: any) => t.is_active)
                .map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Mesa {t.number}
                    {t.label ? ` - ${t.label}` : ''}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Customer Section */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Cliente
          </p>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-primary-50 border border-primary/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={onClearCustomer}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : showCustomerSearch ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={customerSearch}
                  onChange={(e) => onCustomerSearchChange(e.target.value)}
                  placeholder="Nome ou telefone..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  autoFocus
                />
                <button
                  onClick={() => {
                    onShowCustomerSearch(false);
                    onCustomerSearchChange('');
                  }}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {filteredCustomers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onShowCustomerSearch(false);
                      onCustomerSearchChange('');
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    Nenhum encontrado
                  </p>
                )}
              </div>
            </div>
          ) : showNewCustomer ? (
            <div className="space-y-2">
              <input
                value={newCustomerName}
                onChange={(e) => onNewCustomerNameChange(e.target.value)}
                placeholder="Nome"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                autoFocus
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => onNewCustomerPhoneChange(e.target.value)}
                placeholder="Telefone"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onShowNewCustomer(false);
                    onNewCustomerNameChange('');
                    onNewCustomerPhoneChange('');
                  }}
                  className="flex-1 text-sm font-medium text-gray-500 hover:text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={
                    creatingCustomer ||
                    !newCustomerName.trim() ||
                    !newCustomerPhone.trim()
                  }
                  onClick={onCreateCustomer}
                  className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors active:scale-95"
                >
                  {creatingCustomer ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onShowCustomerSearch(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all active:scale-95"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
              <button
                onClick={() => onShowNewCustomer(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" /> Novo
              </button>
              <button
                className="flex items-center justify-center py-3 px-4 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all active:scale-95"
                title="Sem cliente"
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Itens do Pedido
            </p>
            {cart.length > 0 && (
              <span className="text-xs font-medium text-gray-400">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Carrinho vazio</p>
              <p className="text-xs mt-1">Clique em um produto para adicionar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => {
                const itemTotal =
                  (item.unit_price +
                    item.extras.reduce((s, e) => s + e.price, 0)) *
                  item.quantity;

                return (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 group hover:bg-gray-100/80 transition-colors"
                  >
                    {/* Product thumbnail */}
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200/50 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-gray-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {item.product_name}
                      </p>
                      {item.variation_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.variation_name}
                        </p>
                      )}
                      {item.extras.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          + {item.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-400 italic mt-0.5">
                          {item.notes}
                        </p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(index, -1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white text-gray-500 active:scale-95 transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold w-7 text-center text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(index, 1)}
                          className="w-7 h-7 rounded-lg border border-primary/50 text-primary flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(index)}
                          className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center ml-1 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <p className="text-sm font-bold text-primary shrink-0">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment + Totals Footer (passed as children) */}
      {cart.length > 0 && children}
    </div>
  );
}
