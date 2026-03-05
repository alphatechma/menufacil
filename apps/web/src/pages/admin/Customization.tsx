import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, AlertCircle, Eye, Palette, Type, Image as ImageIcon } from 'lucide-react';
import { useGetTenantBySlugQuery, useUpdateTenantMutation } from '@/api/adminApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setTenantSlug } from '@/store/slices/adminAuthSlice';
import { customizationSchema, type CustomizationFormData } from '@/schemas/admin/customizationSchema';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageSpinner } from '@/components/ui/Spinner';

const PRESET_COLORS = [
  '#FF6B35', '#E53E3E', '#DD6B20', '#D69E2E',
  '#38A169', '#319795', '#3182CE', '#5A67D8',
  '#805AD5', '#D53F8C', '#1A202C', '#718096',
];

export default function Customization() {
  const dispatch = useAppDispatch();
  const tenantSlug = useAppSelector((state) => state.adminAuth.tenantSlug);
  const { data: tenant, isLoading } = useGetTenantBySlugQuery(tenantSlug!, { skip: !tenantSlug });
  const [updateTenant, { isLoading: isSaving, error: updateError }] = useUpdateTenantMutation();

  const [successMessage, setSuccessMessage] = useState('');
  const [slugError, setSlugError] = useState('');

  const { control, handleSubmit, reset, watch, setValue } = useForm<CustomizationFormData>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      primary_color: '#FF6B35',
      logo_url: null,
      banner_url: null,
    },
  });

  const watchedName = watch('name');
  const watchedSlug = watch('slug');
  const watchedColor = watch('primary_color');
  const watchedLogo = watch('logo_url');
  const watchedBanner = watch('banner_url');

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? '',
        slug: tenant.slug ?? '',
        primary_color: tenant.primary_color ?? '#FF6B35',
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
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
        },
      }).unwrap();

      if (data.slug !== tenantSlug) {
        dispatch(setTenantSlug(data.slug));
      }

      setSuccessMessage('Personalizacao salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const msg = err?.data?.message || '';
      if (msg.toLowerCase().includes('slug')) {
        setSlugError('Este slug ja esta em uso. Escolha outro.');
      }
    }
  };

  if (isLoading) return <PageSpinner />;

  const customerBase = (window as any).__RUNTIME_CONFIG__?.CUSTOMER_URL || 'https://app-menufacil.maistechtecnologia.com.br';
  const storeUrl = `${customerBase}/${watchedSlug}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personalizar Pagina"
        actions={
          <Button onClick={handleSubmit(onSubmit)} loading={isSaving}>
            <Save className="w-4 h-4" />
            Salvar Alteracoes
          </Button>
        }
      />

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
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
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-gray-900">Identidade</h2>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <FormField control={control} name="name" label="Nome do restaurante" required>
                {(field) => (
                  <Input {...field} placeholder="Meu Restaurante" />
                )}
              </FormField>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Slug (URL do restaurante)
                </label>
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-4 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-500">
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
                  <p className="text-xs text-gray-400">URL: {storeUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cores */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-gray-900">Cores</h2>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cor principal
              </label>
              <div className="grid grid-cols-6 gap-2 mb-4">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('primary_color', color)}
                    className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-105 ${
                      watchedColor === color
                        ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900/20'
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
                  value={watchedColor}
                  onChange={(e) => setValue('primary_color', e.target.value)}
                  className="w-12 h-12 rounded-xl border border-gray-300 cursor-pointer p-1"
                />
                <Input
                  value={watchedColor}
                  onChange={(e) => setValue('primary_color', e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#FF6B35"
                />
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-gray-900">Imagens</h2>
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
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-gray-900">Pre-visualizacao</h2>
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
                      className="h-28 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden"
                      style={
                        watchedBanner
                          ? { backgroundImage: `url(${watchedBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: `linear-gradient(135deg, ${watchedColor}33, ${watchedColor}66)` }
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
                              style={{ backgroundColor: watchedColor }}
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
                              ? { backgroundColor: watchedColor, color: 'white' }
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
                            <p className="text-[10px] font-bold" style={{ color: watchedColor }}>
                              {product.price}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: watchedColor }}
                          >
                            +
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fake bottom bar */}
                    <div
                      className="mx-3 mb-3 py-2 rounded-xl text-center"
                      style={{ backgroundColor: watchedColor }}
                    >
                      <span className="text-white text-[10px] font-bold">
                        Ver Carrinho - R$ 82,80
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
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
