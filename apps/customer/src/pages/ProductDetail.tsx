import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Check, ShoppingBag } from 'lucide-react';
import { useTenantStore } from '../store/tenantStore';
import { useCartStore } from '../store/cartStore';
import type { Product, CartItemExtra } from '../types';

export function ProductDetail() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const { fetchProductById } = useTenantStore();
  const { addItem, openDrawer } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(
    null,
  );
  const [selectedExtras, setSelectedExtras] = useState<
    Map<string, { name: string; price: number }>
  >(new Map());
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!productId) return;
      setIsLoading(true);
      const data = await fetchProductById(productId);
      if (data) {
        setProduct(data);
        // Auto-select first variation if available
        if (data.variations.length > 0) {
          setSelectedVariation(data.variations[0].id);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [productId]);

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getBasePrice = () => {
    if (!product) return 0;
    if (selectedVariation) {
      const variation = product.variations.find(
        (v) => v.id === selectedVariation,
      );
      return variation?.price || product.base_price;
    }
    return product.base_price;
  };

  const getExtrasTotal = () => {
    return Array.from(selectedExtras.values()).reduce(
      (sum, extra) => sum + extra.price,
      0,
    );
  };

  const getTotalPrice = () => {
    return (getBasePrice() + getExtrasTotal()) * quantity;
  };

  const toggleExtra = (extraId: string, name: string, price: number) => {
    setSelectedExtras((prev) => {
      const next = new Map(prev);
      if (next.has(extraId)) {
        next.delete(extraId);
      } else {
        next.set(extraId, { name, price });
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    if (!product) return;

    const variation = selectedVariation
      ? product.variations.find((v) => v.id === selectedVariation)
      : null;

    const extras: CartItemExtra[] = Array.from(selectedExtras.values());

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variation_id: variation?.id || null,
      variation_name: variation?.name || null,
      unit_price: getBasePrice(),
      quantity,
      extras,
    });

    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      openDrawer();
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-gray-500 text-lg">Produto nao encontrado</p>
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="btn-primary mt-4"
        >
          Voltar ao cardapio
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-20 left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Product image */}
      <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl text-white/60"
            style={{
              background: `linear-gradient(135deg, var(--tenant-primary-light), var(--tenant-primary))`,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="px-4 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        {product.description && (
          <p className="text-gray-500 mt-2 leading-relaxed">
            {product.description}
          </p>
        )}
        <p
          className="text-2xl font-bold mt-3"
          style={{ color: 'var(--tenant-primary)' }}
        >
          {formatPrice(getBasePrice())}
        </p>
      </div>

      {/* Variations */}
      {product.variations.length > 0 && (
        <section className="px-4 pt-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            Escolha uma opcao
            <span className="text-red-500 ml-1 text-sm">*</span>
          </h3>
          <div className="space-y-2">
            {product.variations.map((variation) => (
              <label
                key={variation.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVariation === variation.id
                    ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedVariation === variation.id
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedVariation === variation.id && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-800">
                    {variation.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-700">
                  {formatPrice(variation.price)}
                </span>
                <input
                  type="radio"
                  name="variation"
                  value={variation.id}
                  checked={selectedVariation === variation.id}
                  onChange={() => setSelectedVariation(variation.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Extras */}
      {product.extra_groups.length > 0 &&
        product.extra_groups.map((group) => (
          <section key={group.id} className="px-4 pt-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {group.name}
              {group.is_required && <span className="text-red-500 ml-1 text-sm">*</span>}
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              {group.is_required
                ? `Selecione de ${group.min_select} a ${group.max_select}`
                : `Selecione ate ${group.max_select}`}
            </p>
            <div className="space-y-2">
              {group.extras.map((extra) => {
                const isSelected = selectedExtras.has(extra.id);
                return (
                  <label
                    key={extra.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-gray-800">
                        {extra.name}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-600 text-sm">
                      + {formatPrice(extra.price)}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        toggleExtra(extra.id, extra.name, extra.price)
                      }
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        ))}

      {/* Quantity selector */}
      <section className="px-4 pt-6">
        <h3 className="text-base font-bold text-gray-900 mb-3">Quantidade</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xl font-bold text-gray-900 w-8 text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </section>

      {/* Add to cart bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 safe-area-inset-bottom">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleAddToCart}
            disabled={
              addedToCart ||
              (product.variations.length > 0 && !selectedVariation)
            }
            className={`btn-primary w-full flex items-center justify-between ${
              addedToCart ? 'bg-green-500 hover:bg-green-500' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              {addedToCart ? (
                <>
                  <Check className="w-5 h-5" />
                  Adicionado!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Adicionar
                </>
              )}
            </span>
            <span className="font-bold">{formatPrice(getTotalPrice())}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
