import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  removeItem,
  updateQuantity,
  clearCart,
  closeDrawer,
  selectCartItems,
  selectIsDrawerOpen,
  selectSubtotal,
  selectTotalItems,
} from '@/store/slices/cartSlice';
import type { CartItem } from '@/store/slices/cartSlice';
import { formatPrice } from '@/utils/formatPrice';

export function CartDrawer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectCartItems);
  const isDrawerOpen = useAppSelector(selectIsDrawerOpen);
  const subtotal = useAppSelector(selectSubtotal);
  const totalItems = useAppSelector(selectTotalItems);
  const tenant = useAppSelector((state) => state.tenant.tenant);

  const deliveryFee = tenant?.delivery_fee || 0;
  const total = subtotal + deliveryFee;

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const handleCheckout = () => {
    dispatch(closeDrawer());
    navigate(`/${slug}/checkout`);
  };

  const getItemTotalPrice = (item: CartItem) => {
    const extrasTotal = item.extras.reduce((sum, e) => sum + e.price, 0);
    return (item.unit_price + extrasTotal) * item.quantity;
  };

  return (
    <>
      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 transition-opacity"
          onClick={() => dispatch(closeDrawer())}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag
              className="w-5 h-5"
              style={{ color: 'var(--tenant-primary)' }}
            />
            <h2 className="text-lg font-bold text-gray-900">Seu Carrinho</h2>
            {totalItems > 0 && (
              <span className="text-sm text-gray-400">
                ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
              </span>
            )}
          </div>
          <button
            onClick={() => dispatch(closeDrawer())}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium mb-1">
                Carrinho vazio
              </p>
              <p className="text-gray-400 text-sm">
                Adicione itens do cardapio para comecar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={`${item.product_id}-${item.variation_id}-${index}`}
                  className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {item.product_name}
                    </h4>
                    {item.variation_name && (
                      <p className="text-xs text-gray-500">
                        {item.variation_name}
                      </p>
                    )}
                    {item.extras.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        + {item.extras.map((e) => e.name).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            dispatch(updateQuantity({ index, quantity: item.quantity - 1 }))
                          }
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            dispatch(updateQuantity({ index, quantity: item.quantity + 1 }))
                          }
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(getItemTotalPrice(item))}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch(removeItem(index))}
                    className="p-1.5 self-start rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Clear all */}
              <button
                onClick={() => dispatch(clearCart())}
                className="w-full text-center text-sm text-red-500 hover:text-red-600 font-medium py-2 transition-colors"
              >
                Limpar carrinho
              </button>
            </div>
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Taxa de entrega</span>
              <span>
                {deliveryFee === 0 ? (
                  <span className="text-green-600 font-medium">Gratis</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 rounded-xl text-white font-semibold transition-colors text-center"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  );
}
