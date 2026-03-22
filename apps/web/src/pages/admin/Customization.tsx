import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, AlertCircle, Eye, Palette, Type, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useGetTenantBySlugQuery, useUpdateTenantMutation } from '@/api/adminApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useNotify } from '@/hooks/useNotify';
import { setTenantSlug } from '@/store/slices/adminAuthSlice';
import { customizationSchema, type CustomizationFormData } from '@/schemas/admin/customizationSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SettingsPageSkeleton } from '@/components/ui/Skeleton';

const PRESET_COLORS = [
  '#FF6B35', '#E53E3E', '#DD6B20', '#D69E2E',
  '#38A169', '#319795', '#3182CE', '#5A67D8',
  '#805AD5', '#D53F8C', '#1A202C', '#718096',
];

function buildGradientCSS(colors: (string | null)[]): string {
  const valid = colors.filter(Boolean) as string[];
  if (valid.length <= 1) return valid[0] || '#FF6B35';
  if (valid.length === 2) return `linear-gradient(135deg, ${valid[0]}, ${valid[1]})`;
  return `linear-gradient(135deg, ${valid[0]}, ${valid[1]}, ${valid[2]})`;
}

export default function Customization() {
  const notify = useNotify();
  const dispatch = useAppDispatch();
  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: tenant, isLoading } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [updateTenant, { isLoading: isSaving, error: updateError }] = useUpdateTenantMutation();

  const [successMessage, setSuccessMessage] = useState('');
  const [slugError, setSlugError] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<'primary' | 'secondary' | 'accent'>('primary');

  const { control, handleSubmit, reset, watch, setValue } = useForm<CustomizationFormData>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      primary_color: '#FF6B35',
      secondary_color: null,
      accent_color: null,
      logo_url: null,
      banner_url: null,
    },
  });

  const watchedName = watch('name');
  const watchedSlug = watch('slug');
  const watchedPrimary = watch('primary_color');
  const watchedSecondary = watch('secondary_color');
  const watchedAccent = watch('accent_color');
  const watchedLogo = watch('logo_url');
  const watchedBanner = watch('banner_url');

  const allColors = [watchedPrimary, watchedSecondary, watchedAccent];
  const activeColors = allColors.filter(Boolean) as string[];
  const gradientCSS = buildGradientCSS(allColors);
  const hasMultipleColors = activeColors.length > 1;

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? '',
        slug: tenant.slug ?? '',
        primary_color: tenant.primary_color ?? '#FF6B35',
        secondary_color: tenant.secondary_color ?? null,
        accent_color: tenant.accent_color ?? null,
        logo_url: tenant.logo_url ?? null,
        banner_url: tenant.banner_url ?? null,
      });
    }
  }, [tenant, reset]);

  const handleSlugChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('slug', sanitized);
    setSlugError('');
    if (sanitized.length > 0 && sanitized.length < 3) {
      setSlugError('O slug deve ter pelo menos 3 caracteres.');
    }
  };

  const onSubmit = async (data: CustomizationFormData) => {
    if (!tenant) return;
    if (data.slug.length < 3) {
      setSlugError('O slug deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      await updateTenant({
        id: tenant.id,
        data: {
          name: data.name,
          slug: data.slug,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color || null,
          accent_color: data.accent_color || null,
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
        },
      }).unwrap();

      if (data.slug !== tenantSlug) {
        dispatch(setTenantSlug(data.slug));
      }

      setSuccessMessage('Personalizacao salva com sucesso!');
      notify.success('Personalizacao salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const msg = err?.data?.message || '';
      if (msg.toLowerCase().includes('slug')) {
        setSlugError('Este slug ja esta em uso. Escolha outro.');
      }
      notify.error(msg || 'Erro ao salvar personalizacao.');
    }
  };

  const handleSetColor = (color: string) => {
    if (activeColorPicker === 'primary') setValue('primary_color', color);
    else if (activeColorPicker === 'secondary') setValue('secondary_color', color);
    else if (activeColorPicker === 'accent') setValue('accent_color', color);
  };

  const getActivePickerValue = () => {
    if (activeColorPicker === 'primary') return watchedPrimary;
    if (activeColorPicker === 'secondary') return watchedSecondary || '#000000';
    return watchedAccent || '#000000';
  };

  if (isLoading) return <SettingsPageSkeleton />;

  const customerBase = (window as any).__RUNTIME_CONFIG__?.CUSTOMER_URL || 'https://app-menufacil.maistechtecnologia.com.br';
  const storeUrl = `${customerBase}/${watchedSlug}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personalizar Página"
        actions={
          <Button onClick={handleSubmit(onSubmit)} loading={isSaving}>
            <Save className="w-4 h-4" />
            Salvar Alteracoes
          </Button>
        }
      />

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {!!updateError && !slugError && (
        <ErrorAlert message="Erro ao salvar personalizacao. Tente novamente." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form - Left Side */}
        <div className="lg:col-span-3 space-y-6">
          {/* Identidade */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Identidade</h2>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <FormField control={control} name="name" label="Nome do restaurante" required>
                {(field) => (
                  <Input {...field} placeholder="Meu Restaurante" />
                )}
              </FormField>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Slug (URL do restaurante)
                </label>
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-4 bg-muted border border-r-0 border-border rounded-l-xl text-sm text-muted-foreground">
                    menufacil.com/
                  </span>
                  <Input
                    value={watchedSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`rounded-l-none ${
                      slugError ? 'border-red-300 focus:ring-red-500' : ''
                    }`}
                    placeholder="meu-restaurante"
                  />
                </div>
                {slugError ? (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {slugError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">URL: {storeUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cores */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Cores</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione ate 3 cores para criar um gradiente personalizado.
              </p>
            </div>
            <div className="p-5 space-y-5">
              {/* Color slots */}
              <div className="space-y-3">
                {/* Gradient preview bar */}
                {hasMultipleColors && (
                  <div
                    className="h-12 rounded-xl border border-border"
                    style={{ background: gradientCSS }}
                  />
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Primary */}
                  <button
                    type="button"
                    onClick={() => setActiveColorPicker('primary')}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                      activeColorPicker === 'primary' ? 'border-foreground shadow-sm' : 'border-border'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: watchedPrimary }} />
                    <div className="text-left">
                      <span className="text-xs font-medium text-foreground block">Principal</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{watchedPrimary}</span>
                    </div>
                  </button>

                  {/* Secondary */}
                  {watchedSecondary ? (
                    <button
                      type="button"
                      onClick={() => setActiveColorPicker('secondary')}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                        activeColorPicker === 'secondary' ? 'border-foreground shadow-sm' : 'border-border'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: watchedSecondary }} />
                      <div className="text-left">
                        <span className="text-xs font-medium text-foreground block">Secundaria</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{watchedSecondary}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setValue('secondary_color', null);
                          if (!watchedSecondary) setValue('accent_color', null);
                          setActiveColorPicker('primary');
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('secondary_color', '#006600');
                        setActiveColorPicker('secondary');
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">2a cor</span>
                    </button>
                  )}

                  {/* Accent - only show when secondary exists */}
                  {watchedSecondary && (
                    watchedAccent ? (
                      <button
                        type="button"
                        onClick={() => setActiveColorPicker('accent')}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                          activeColorPicker === 'accent' ? 'border-foreground shadow-sm' : 'border-border'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: watchedAccent }} />
                        <div className="text-left">
                          <span className="text-xs font-medium text-foreground block">Destaque</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{watchedAccent}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue('accent_color', null);
                            setActiveColorPicker('primary');
                          }}
                          className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('accent_color', '#FF0000');
                          setActiveColorPicker('accent');
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">3a cor</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Color picker for active slot */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  {activeColorPicker === 'primary' ? 'Cor principal' : activeColorPicker === 'secondary' ? 'Cor secundaria' : 'Cor de destaque'}
                </label>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleSetColor(color)}
                      className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-105 ${
                        getActivePickerValue() === color
                          ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={getActivePickerValue()}
                    onChange={(e) => handleSetColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-border cursor-pointer p-1"
                  />
                  <Input
                    value={getActivePickerValue()}
                    onChange={(e) => handleSetColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#FF6B35"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Imagens</h2>
              </div>
            </div>
            <div className="p-5 space-y-6">
              <FormField control={control} name="logo_url" label="Logo">
                {(field) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    className="h-32"
                  />
                )}
              </FormField>

              <FormField control={control} name="banner_url" label="Banner">
                {(field) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              </FormField>
            </div>
          </div>
        </div>

        {/* Preview - Right Side */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="bg-card rounded-xl border border-border">
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-foreground">Pre-visualizacao</h2>
                </div>
              </div>
              <div className="p-5">
                {/* Phone mockup */}
                <div className="mx-auto w-full max-w-[280px] rounded-[24px] border-[3px] border-gray-800 bg-gray-800 overflow-hidden shadow-xl">
                  {/* Status bar */}
                  <div className="bg-gray-800 px-4 py-1.5 flex items-center justify-between">
                    <span className="text-white text-[10px] font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 bg-white/80 rounded-sm" />
                      <div className="w-3 h-2 bg-white/80 rounded-sm" />
                      <div className="w-5 h-2.5 bg-white/80 rounded-sm" />
                    </div>
                  </div>

                  <div className="bg-white">
                    {/* Banner */}
                    <div
                      className="h-28 relative overflow-hidden"
                      style={
                        watchedBanner
                          ? { backgroundImage: `url(${watchedBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: hasMultipleColors ? gradientCSS : `linear-gradient(135deg, ${watchedPrimary}33, ${watchedPrimary}66)` }
                      }
                    >
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 to-transparent">
                        <div className="flex items-center gap-2">
                          {watchedLogo ? (
                            <img
                              src={watchedLogo}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                              style={{ background: hasMultipleColors ? gradientCSS : watchedPrimary }}
                            >
                              {watchedName?.charAt(0)?.toUpperCase() || 'R'}
                            </div>
                          )}
                          <div>
                            <p className="text-white text-xs font-bold leading-tight drop-shadow">
                              {watchedName || 'Meu Restaurante'}
                            </p>
                            <p className="text-white/80 text-[9px] drop-shadow">Aberto agora</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fake categories */}
                    <div className="px-3 pt-3 flex gap-1.5 overflow-hidden">
                      {['Populares', 'Pizzas', 'Bebidas'].map((cat, i) => (
                        <span
                          key={cat}
                          className="px-2.5 py-1 rounded-full text-[9px] font-medium whitespace-nowrap"
                          style={
                            i === 0
                              ? { background: hasMultipleColors ? gradientCSS : watchedPrimary, color: 'white' }
                              : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                          }
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Fake products */}
                    <div className="px-3 py-3 space-y-2">
                      {[
                        { name: 'Margherita', price: 'R$ 39,90' },
                        { name: 'Calabresa', price: 'R$ 42,90' },
                        { name: 'Portuguesa', price: 'R$ 45,90' },
                      ].map((product) => (
                        <div
                          key={product.name}
                          className="flex items-center gap-2 p-2 rounded-lg border border-gray-100"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-gray-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-[10px] font-bold" style={{ color: watchedPrimary }}>
                              {product.price}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ background: hasMultipleColors ? gradientCSS : watchedPrimary }}
                          >
                            +
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fake bottom bar */}
                    <div
                      className="mx-3 mb-3 py-2 rounded-xl text-center"
                      style={{ background: hasMultipleColors ? gradientCSS : watchedPrimary }}
                    >
                      <span className="text-white text-[10px] font-bold">
                        Ver Carrinho - R$ 82,80
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Visualizacao aproximada da vitrine
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
