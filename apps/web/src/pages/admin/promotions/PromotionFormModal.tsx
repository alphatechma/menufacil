import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import {
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '@/api/adminApi';
import { cn } from '@/utils/cn';

const PROMO_TYPES = [
  { value: 'combo', label: 'Combo' },
  { value: 'happy_hour', label: 'Happy Hour' },
  { value: 'weekday', label: 'Dia da Semana' },
  { value: 'buy_x_get_y', label: 'Compre X Leve Y' },
  { value: 'discount', label: 'Desconto' },
];

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  promotion?: any;
}

export default function PromotionFormModal({ open, onClose, promotion }: Props) {
  const [createPromotion, { isLoading: isCreating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: isUpdating }] = useUpdatePromotionMutation();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();

  const isEditing = !!promotion;
  const isLoading = isCreating || isUpdating;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('discount');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('');
  const [getQuantity, setGetQuantity] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');

  useEffect(() => {
    if (promotion) {
      setName(promotion.name || '');
      setDescription(promotion.description || '');
      setType(promotion.type || 'discount');
      setDiscountType(promotion.discount_type || 'percent');
      setDiscountValue(String(promotion.discount_value || ''));
      setIsActive(promotion.is_active ?? true);
      setValidFrom(promotion.valid_from ? promotion.valid_from.slice(0, 16) : '');
      setValidTo(promotion.valid_to ? promotion.valid_to.slice(0, 16) : '');
      setSelectedProducts(promotion.rules?.products || []);
      setSelectedCategories(promotion.rules?.categories || []);
      setSelectedDays(promotion.schedule?.days || []);
      setStartTime(promotion.schedule?.start_time || '');
      setEndTime(promotion.schedule?.end_time || '');
      setBuyQuantity(String(promotion.rules?.buy_quantity || ''));
      setGetQuantity(String(promotion.rules?.get_quantity || ''));
      setMinOrderValue(String(promotion.rules?.min_order_value || ''));
    } else {
      setName('');
      setDescription('');
      setType('discount');
      setDiscountType('percent');
      setDiscountValue('');
      setIsActive(true);
      setValidFrom('');
      setValidTo('');
      setSelectedProducts([]);
      setSelectedCategories([]);
      setSelectedDays([]);
      setStartTime('');
      setEndTime('');
      setBuyQuantity('');
      setGetQuantity('');
      setMinOrderValue('');
    }
  }, [promotion, open]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name,
      description: description || null,
      type,
      discount_type: discountType,
      discount_value: Number(discountValue),
      is_active: isActive,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      rules: {
        products: selectedProducts.length > 0 ? selectedProducts : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        buy_quantity: buyQuantity ? Number(buyQuantity) : undefined,
        get_quantity: getQuantity ? Number(getQuantity) : undefined,
        min_order_value: minOrderValue ? Number(minOrderValue) : undefined,
      },
      schedule: {
        days: selectedDays.length > 0 ? selectedDays : undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
      },
    };

    try {
      if (isEditing) {
        await updatePromotion({ id: promotion.id, data }).unwrap();
      } else {
        await createPromotion(data).unwrap();
      }
      onClose();
    } catch {
      // error handled by RTK Query
    }
  };

  const needsProductSelection = ['combo', 'happy_hour', 'buy_x_get_y', 'discount'].includes(type);
  const needsSchedule = ['happy_hour', 'weekday'].includes(type);
  const needsBuyXGetY = type === 'buy_x_get_y';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Promocao' : 'Nova Promocao'}
      className="md:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name & Description */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Nome
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Happy Hour Pizza"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Descricao
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao opcional"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-2 block">
            Tipo
          </label>
          <div className="flex flex-wrap gap-2">
            {PROMO_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  type === t.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-primary',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Discount type & value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Tipo de Desconto
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  discountType === 'percent'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground',
                )}
              >
                Percentual (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  discountType === 'fixed'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground',
                )}
              >
                Fixo (R$)
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Valor do Desconto
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '5.00'}
              required
            />
          </div>
        </div>

        {/* Minimum order value */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
            Valor Minimo do Pedido (opcional)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Buy X Get Y */}
        {needsBuyXGetY && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
                Compre (quantidade)
              </label>
              <Input
                type="number"
                min="1"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                placeholder="2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
                Leve gratis (quantidade)
              </label>
              <Input
                type="number"
                min="1"
                value={getQuantity}
                onChange={(e) => setGetQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        )}

        {/* Schedule */}
        {needsSchedule && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-foreground block">
              Agenda
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    'w-10 h-10 rounded-lg text-sm font-medium border transition-colors',
                    selectedDays.includes(d.value)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-primary',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Horario Inicio</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Horario Fim</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product/Category selection */}
        {needsProductSelection && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-foreground block">
              Produtos (opcional)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-border rounded-xl p-2 space-y-1">
              {products.map((p: any) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700 dark:text-foreground">{p.name}</span>
                </label>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhum produto</p>
              )}
            </div>

            <label className="text-sm font-medium text-gray-700 dark:text-foreground block">
              Categorias (opcional)
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-border rounded-xl p-2 space-y-1">
              {categories.map((c: any) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700 dark:text-foreground">{c.name}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhuma categoria</p>
              )}
            </div>
          </div>
        )}

        {/* Validity dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Valido de
            </label>
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-foreground mb-1 block">
              Valido ate
            </label>
            <Input
              type="datetime-local"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-foreground">
            Ativa
          </label>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
