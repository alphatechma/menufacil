import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Check, ShoppingBag, AlertCircle, Lock } from 'lucide-react';
import { useGetStorefrontProductQuery } from '@/api/customerApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addItem, openDrawer } from '@/store/slices/cartSlice';
import { formatPrice } from '@/utils/formatPrice';
import type { CartItemExtra } from '@/store/slices/cartSlice';

export default function ProductDetail() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const tenant = useAppSelector((state) => state.tenant.tenant);
  const isClosed = tenant && !tenant.is_open;

  const { data: product, isLoading } = useGetStorefrontProductQuery(
    { slug: slug!, productId: productId! },
    { skip: !slug || !productId },
  );

  const [selectedVariations, setSelectedVariations] = useState<Map<string, number>>(new Map());
  const [selectedExtras, setSelectedExtras] = useState<
    Map<string, { name: string; price: number }>
  >(new Map());
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const minVariations = product?.min_variations ?? 0;
  const maxVariations = product?.max_variations ?? 0;
  const isMultiSelect = maxVariations > 1;
  const isSingleSelect = !isMultiSelect;
  const hasVariations = product?.variations && product.variations.length > 0;
  const isRequired = minVariations > 0;

  const totalSelectedParts = Array.from(selectedVariations.values()).reduce((a, b) => a + b, 0);

  // Auto-select first variation for single-select required
  useEffect(() => {
    if (product?.variations && product.variations.length > 0 && isSingleSelect && isRequired) {
      setSelectedVariations(new Map([[product.variations[0].id, 1]]));
    }
  }, [product, isSingleSelect, isRequired]);

  // Clear errors when user changes selections
  useEffect(() => {
    if (showErrors) {
      const newErrors = validate();
      if (newErrors.length === 0) {
        setErrors([]);
        setShowErrors(false);
      } else {
        setErrors(newErrors);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariations.size, totalSelectedParts, selectedExtras.size]);

  const toggleVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);

      if (isSingleSelect) {
        // Radio behavior: select one, deselect others
        if (next.has(variationId) && !isRequired) {
          next.clear();
        } else {
          next.clear();
          next.set(variationId, 1);
        }
      } else {
        // Toggle: add with qty 1 or remove
        if (next.has(variationId)) {
          next.delete(variationId);
        } else if (maxVariations === 0 || totalSelectedParts < maxVariations) {
          next.set(variationId, 1);
        }
      }

      return next;
    });
  };

  const incrementVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      const current = next.get(variationId) || 0;
      const total = Array.from(next.values()).reduce((a, b) => a + b, 0);
      if (maxVariations > 0 && total >= maxVariations) return prev;
      next.set(variationId, current + 1);
      return next;
    });
  };

  const decrementVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      const current = next.get(variationId) || 0;
      if (current <= 1) {
        next.delete(variationId);
      } else {
        next.set(variationId, current - 1);
      }
      return next;
    });
  };

  const getBasePrice = () => {
    if (!product) return 0;
    if (selectedVariations.size === 0) return Number(product.base_price);

    if (isMultiSelect && totalSelectedParts > 0) {
      // Multi-select: use the highest variation price (pizza rule — price is always the base)
      let maxPrice = 0;
      for (const [varId] of selectedVariations) {
        const variation = product.variations?.find((v: any) => v.id === varId);
        if (variation) {
          const p = Number(variation.price);
          if (p > maxPrice) maxPrice = p;
        }
      }
      return maxPrice;
    }

    // Single-select: use the selected variation's price
    const selectedPrices = product.variations
      ?.filter((v: any) => selectedVariations.has(v.id))
      .map((v: any) => Number(v.price)) || [];

    if (selectedPrices.length === 0) return Number(product.base_price);

    return selectedPrices[0];
  };

  const getExtrasTotal = () => {
    return Array.from(selectedExtras.values()).reduce(
      (sum, extra) => sum + Number(extra.price),
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

  const validate = (): string[] => {
    const errs: string[] = [];

    if (hasVariations && isRequired) {
      if (isSingleSelect && selectedVariations.size === 0) {
        errs.push('Selecione uma opcao');
      } else if (isMultiSelect) {
        if (totalSelectedParts < minVariations) {
          const falta = minVariations - totalSelectedParts;
          errs.push(
            `Selecione pelo menos ${minVariations} ${minVariations === 1 ? 'parte' : 'partes'} (falta${falta === 1 ? '' : 'm'} ${falta})`,
          );
        }
      }
    }

    if (product?.extra_groups) {
      for (const group of product.extra_groups) {
        if (group.is_required) {
          const selectedInGroup = group.extras.filter((e: any) => selectedExtras.has(e.id)).length;
          if (selectedInGroup < (group.min_select || 1)) {
            errs.push(`Selecione pelo menos ${group.min_select || 1} item em "${group.name}"`);
          }
        }
      }
    }

    return errs;
  };

  const handleAddToCart = () => {
    if (!product) return;

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShowErrors(true);
      return;
    }

    setErrors([]);
    setShowErrors(false);

    const selected = product.variations?.filter((v: any) => selectedVariations.has(v.id)) || [];
    const variationId = selected[0]?.id || null;
    const variationIds = selected.length > 0 ? selected.map((v: any) => v.id) : undefined;

    // Build variation name with quantities for multi-select
    let variationName: string | null = null;
    let variationQuantities: Record<string, number> | undefined;
    if (isMultiSelect && totalSelectedParts > 0) {
      variationName = selected
        .map((v: any) => {
          const qty = selectedVariations.get(v.id) || 1;
          return `${qty}/${totalSelectedParts} ${v.name}`;
        })
        .join(' / ');
      variationQuantities = Object.fromEntries(selectedVariations);
    } else {
      variationName = selected.map((v: any) => v.name).join(' / ') || null;
    }

    const extras: CartItemExtra[] = Array.from(selectedExtras.values());

    dispatch(
      addItem({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url || product.category?.image_url,
        variation_id: variationId,
        variation_ids: variationIds,
        variation_name: variationName,
        variation_quantities: variationQuantities,
        unit_price: getBasePrice(),
        quantity,
        extras,
        notes: notes.trim() || undefined,
      }),
    );

    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      dispatch(openDrawer());
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
          className="mt-4 px-6 py-3 rounded-xl text-white font-semibold transition-colors"
          style={{ background: 'var(--tenant-gradient)' }}
        >
          Voltar ao cardapio
        </button>
      </div>
    );
  }

  return (
    <div className="pb-44">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-20 left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Product image */}
      <div className={`w-full aspect-[4/3] bg-gray-100 overflow-hidden relative ${isClosed ? 'grayscale' : ''}`}>
        {(product.image_url || product.category?.image_url) ? (
          <img
            src={product.image_url || product.category?.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl text-white/60"
            style={{
              background: isClosed
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : `var(--tenant-gradient)`,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
        {isClosed && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-bold text-gray-700">Estabelecimento fechado</p>
                {tenant?.next_open_label && (
                  <p className="text-xs text-gray-500">{tenant.next_open_label}</p>
                )}
              </div>
            </div>
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
      {hasVariations && (
        <section className="px-4 pt-6">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {isMultiSelect ? 'Escolha suas opcoes' : 'Escolha uma opcao'}
            {isRequired && <span className="text-red-500 ml-1 text-sm">*</span>}
          </h3>
          {isMultiSelect && (
            <p className="text-sm text-gray-400 mb-3">
              {minVariations > 0
                ? `Selecione de ${minVariations} a ${maxVariations} partes`
                : `Selecione ate ${maxVariations} partes`}
              {totalSelectedParts > 0 && (
                <span className="ml-1 font-medium text-gray-600">
                  ({totalSelectedParts}/{maxVariations})
                </span>
              )}
            </p>
          )}
          <div className="space-y-2">
            {product.variations.map((variation: any) => {
              const isSelected = selectedVariations.has(variation.id);
              const varQty = selectedVariations.get(variation.id) || 0;
              const canAdd = maxVariations === 0 || totalSelectedParts < maxVariations;

              if (isMultiSelect) {
                // Multi-select: quantity controls
                return (
                  <div
                    key={variation.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800">{variation.name}</span>
                      <span className="text-sm text-gray-500 ml-2">{formatPrice(variation.price)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => decrementVariation(variation.id)}
                          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                      )}
                      <span className={`w-6 text-center font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-300'}`}>
                        {varQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementVariation(variation.id)}
                        disabled={!canAdd}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                          canAdd
                            ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/10'
                            : 'border-gray-200 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Single-select: radio behavior
              const isDisabled = false; // single-select always allows changing
              return (
                <label
                  key={variation.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isDisabled
                      ? 'border-gray-100 opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 cursor-pointer'
                        : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
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
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggleVariation(variation.id)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Extras */}
      {product.extra_groups &&
        product.extra_groups.length > 0 &&
        product.extra_groups.map((group: any) => (
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
              {group.extras.map((extra: any) => {
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

      {/* Observation / Notes */}
      <section className="px-4 pt-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Observacao</h3>
        <p className="text-sm text-gray-400 mb-3">Alguma preferencia ou restricao?</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: sem cebola, bem passado..."
          maxLength={200}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[var(--tenant-primary)] focus:outline-none text-sm text-gray-700 resize-none transition-colors"
        />
      </section>

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
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          {/* Error messages */}
          {showErrors && errors.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {errors.map((error, i) => (
                    <p key={i} className="text-sm text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            {isClosed ? (
              <div className="w-full text-center px-6 py-3.5 rounded-xl bg-gray-200 text-gray-500 font-semibold text-sm">
                <p>Loja fechada</p>
                {tenant?.next_open_label && <p className="text-xs font-medium mt-0.5">{tenant.next_open_label}</p>}
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={addedToCart}
                className={`w-full flex items-center justify-between px-6 py-3.5 rounded-xl text-white font-semibold transition-all ${
                  addedToCart ? 'bg-green-500 hover:bg-green-500' : ''
                } disabled:opacity-50`}
                style={!addedToCart ? { background: 'var(--tenant-gradient)' } : {}}
              >
                {addedToCart ? (
                  <span className="flex items-center gap-2 mx-auto">
                    <Check className="w-5 h-5" />
                    Adicionado!
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Adicionar {quantity > 1 ? `${quantity} itens` : '1 item'}
                    </span>
                    <span className="font-bold">{formatPrice(getTotalPrice())}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
