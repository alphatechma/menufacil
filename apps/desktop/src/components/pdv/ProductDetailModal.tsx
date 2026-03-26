import { useState } from 'react';
import { Plus, Minus, Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/formatPrice';
import type { CartItem } from './types';

interface ProductDetailModalProps {
  product: any;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAdd,
}: ProductDetailModalProps) {
  const hasVariations = product.variations && product.variations.length > 0;
  const minVariations = product.min_variations ?? 0;
  const maxVariations = product.max_variations ?? 0;
  const isMultiSelect = maxVariations > 1;
  const isRequired = minVariations > 0;

  const [selectedVariations, setSelectedVariations] = useState<
    Map<string, number>
  >(() => {
    if (hasVariations && !isMultiSelect && isRequired) {
      return new Map([[product.variations[0].id, 1]]);
    }
    return new Map();
  });
  const [selectedExtras, setSelectedExtras] = useState<
    Map<string, { name: string; price: number }>
  >(new Map());
  const [qty, setQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const totalSelectedParts = Array.from(selectedVariations.values()).reduce(
    (a, b) => a + b,
    0,
  );

  const toggleVariation = (variationId: string) => {
    setSelectedVariations((prev) => {
      const next = new Map(prev);
      if (!isMultiSelect) {
        if (next.has(variationId) && !isRequired) {
          next.clear();
        } else {
          next.clear();
          next.set(variationId, 1);
        }
      } else {
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

  const toggleExtra = (extra: any, group: any) => {
    setSelectedExtras((prev) => {
      const next = new Map(prev);
      if (next.has(extra.id)) {
        next.delete(extra.id);
      } else {
        const selectedInGroup = group.extras.filter((e: any) =>
          next.has(e.id),
        ).length;
        if (group.max_select && selectedInGroup >= group.max_select) return prev;
        next.set(extra.id, { name: extra.name, price: Number(extra.price) });
      }
      return next;
    });
  };

  const getBasePrice = () => {
    if (selectedVariations.size === 0) return Number(product.base_price);
    if (isMultiSelect && totalSelectedParts > 0) {
      const basePrice = Number(product.base_price);
      let maxVarPrice = 0;
      for (const [varId] of selectedVariations) {
        const variation = product.variations?.find((v: any) => v.id === varId);
        if (variation) {
          const p = Number(variation.price);
          if (p > maxVarPrice) maxVarPrice = p;
        }
      }
      return Math.max(basePrice, maxVarPrice);
    }
    const selected = product.variations?.find((v: any) =>
      selectedVariations.has(v.id),
    );
    return selected ? Number(selected.price) : Number(product.base_price);
  };

  const unitPrice = getBasePrice();
  const extrasTotal = Array.from(selectedExtras.values()).reduce(
    (s, e) => s + e.price,
    0,
  );
  const totalPrice = (unitPrice + extrasTotal) * qty;

  const isSelectionIncomplete =
    hasVariations &&
    isRequired &&
    isMultiSelect &&
    totalSelectedParts < minVariations;

  const validate = (): string[] => {
    const errs: string[] = [];
    if (hasVariations && isRequired) {
      if (!isMultiSelect && selectedVariations.size === 0)
        errs.push('Selecione uma opção');
      else if (isMultiSelect && totalSelectedParts < minVariations)
        errs.push(
          `Escolha ${minVariations} ${minVariations === 1 ? 'sabor' : 'sabores'} para completar. Falta${minVariations - totalSelectedParts === 1 ? '' : 'm'} ${minVariations - totalSelectedParts}.`,
        );
    }
    if (product.extra_groups) {
      for (const group of product.extra_groups) {
        if (group.is_required) {
          const selectedInGroup = group.extras.filter((e: any) =>
            selectedExtras.has(e.id),
          ).length;
          if (selectedInGroup < (group.min_select || 1))
            errs.push(
              `Selecione pelo menos ${group.min_select || 1} item em "${group.name}"`,
            );
        }
      }
    }
    return errs;
  };

  const handleAdd = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    const selected =
      product.variations?.filter((v: any) => selectedVariations.has(v.id)) || [];
    let variationName: string | undefined;
    if (isMultiSelect && totalSelectedParts > 0) {
      variationName = selected
        .map((v: any) => {
          const vQty = selectedVariations.get(v.id) || 1;
          return `${vQty}/${totalSelectedParts} ${v.name}`;
        })
        .join(' / ');
    } else {
      variationName =
        selected.map((v: any) => v.name).join(' / ') || undefined;
    }
    onAdd({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variation_id: selected[0]?.id,
      variation_name: variationName,
      unit_price: unitPrice,
      quantity: qty,
      extras: Array.from(selectedExtras.values()),
      notes: itemNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              A partir de {formatPrice(product.base_price)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Variations */}
          {hasVariations && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-base font-semibold text-gray-900">
                  {isMultiSelect ? 'Escolha suas opções' : 'Escolha uma opção'}
                </p>
                {isRequired && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                )}
              </div>

              {/* Multi-select progress */}
              {isMultiSelect && (
                <div className="mb-3">
                  <p className="text-sm text-gray-500">
                    {minVariations === maxVariations
                      ? `Escolha ${maxVariations} ${maxVariations === 1 ? 'sabor' : 'sabores'} — pode ser um só sabor ou sabores diferentes`
                      : minVariations > 0
                        ? `Escolha de ${minVariations} a ${maxVariations} sabores`
                        : `Escolha até ${maxVariations} sabores`}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          totalSelectedParts >= minVariations
                            ? 'bg-primary'
                            : 'bg-warning',
                        )}
                        style={{
                          width: `${Math.min(100, (totalSelectedParts / maxVariations) * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        totalSelectedParts >= minVariations
                          ? 'text-primary'
                          : 'text-amber-600',
                      )}
                    >
                      {totalSelectedParts}/{maxVariations}
                    </span>
                  </div>
                  {totalSelectedParts > 0 &&
                    totalSelectedParts < minVariations && (
                      <p className="text-xs text-amber-600 mt-1">
                        Falta
                        {minVariations - totalSelectedParts === 1 ? '' : 'm'}{' '}
                        {minVariations - totalSelectedParts}
                      </p>
                    )}
                  {totalSelectedParts === maxVariations && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      Seleção completa!
                    </p>
                  )}
                </div>
              )}

              {/* Variation options */}
              <div className="space-y-2">
                {product.variations.map((v: any) => {
                  const isSelected = selectedVariations.has(v.id);
                  const varQty = selectedVariations.get(v.id) || 0;
                  const canAdd =
                    maxVariations === 0 || totalSelectedParts < maxVariations;

                  if (isMultiSelect) {
                    return (
                      <div
                        key={v.id}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                          isSelected
                            ? 'border-primary bg-primary-50'
                            : 'border-gray-200',
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">
                            {v.name}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {formatPrice(v.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <button
                              onClick={() => decrementVariation(v.id)}
                              className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            className={cn(
                              'w-6 text-center text-sm font-bold',
                              isSelected ? 'text-gray-900' : 'text-gray-400',
                            )}
                          >
                            {varQty}
                          </span>
                          <button
                            onClick={() => incrementVariation(v.id)}
                            disabled={!canAdd}
                            className={cn(
                              'w-8 h-8 rounded-xl border flex items-center justify-center active:scale-95 transition-all',
                              canAdd
                                ? 'border-primary text-primary hover:bg-primary-50'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed',
                            )}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleVariation(v.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.99]',
                        isSelected
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-200 hover:border-primary/30',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-gray-300',
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {v.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-500">
                        {formatPrice(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Groups */}
          {product.extra_groups?.map((group: any) => {
            if (!group.extras?.length) return null;
            const selectedInGroup = group.extras.filter((e: any) =>
              selectedExtras.has(e.id),
            ).length;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-base font-semibold text-gray-900">
                    {group.name}
                  </p>
                  {group.is_required && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Obrigatório
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {group.is_required
                    ? `De ${group.min_select || 1} a ${group.max_select}`
                    : `Até ${group.max_select}`}
                  {selectedInGroup > 0 && (
                    <span className="ml-2 font-semibold text-primary">
                      ({selectedInGroup}/{group.max_select})
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {group.extras.map((extra: any) => {
                    const isSelected = selectedExtras.has(extra.id);
                    const atMax =
                      !isSelected &&
                      group.max_select &&
                      selectedInGroup >= group.max_select;
                    return (
                      <button
                        key={extra.id}
                        onClick={() => !atMax && toggleExtra(extra, group)}
                        disabled={!!atMax}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.99]',
                          atMax
                            ? 'border-gray-200 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-primary bg-primary-50'
                              : 'border-gray-200 hover:border-primary/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-gray-300',
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-500">
                          + {formatPrice(extra.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-gray-900">Quantidade</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 rounded-xl border border-primary text-primary flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <textarea
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            placeholder="Observação do item..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {isSelectionIncomplete && (
            <p className="text-center text-sm text-amber-600 font-medium mb-3">
              Selecione {minVariations - totalSelectedParts}{' '}
              {minVariations - totalSelectedParts === 1 ? 'sabor' : 'sabores'}{' '}
              para adicionar
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={isSelectionIncomplete}
            className={cn(
              'w-full font-semibold py-3.5 px-4 rounded-xl transition-all active:scale-95 text-base',
              isSelectionIncomplete
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark text-white shadow-sm shadow-primary/30',
            )}
          >
            {isSelectionIncomplete
              ? 'Complete a seleção'
              : `Adicionar ${formatPrice(totalPrice)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
