import { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Image,
  Type,
  Save,
  Eye,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  logo_url: string | null;
  banner_url: string | null;
}

export default function Customization() {
  const { tenantSlug, setTenantSlug } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [slugError, setSlugError] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#FF6B35');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const PRESET_COLORS = [
    '#FF6B35', '#E53E3E', '#DD6B20', '#D69E2E',
    '#38A169', '#319795', '#3182CE', '#5A67D8',
    '#805AD5', '#D53F8C', '#1A202C', '#718096',
  ];

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const authData = JSON.parse(localStorage.getItem('menufacil-admin-auth') || '{}');
      const currentSlug = authData?.state?.tenantSlug;

      if (!currentSlug) {
        setErrorMessage('Faca login novamente.');
        setLoading(false);
        return;
      }

      const { data } = await api.get<TenantData>(`/tenants/slug/${currentSlug}`);
      setTenantId(data.id);
      setName(data.name || '');
      setSlug(data.slug || '');
      setOriginalSlug(data.slug || '');
      setPrimaryColor(data.primary_color || '#FF6B35');
      setLogoUrl(data.logo_url || '');
      setBannerUrl(data.banner_url || '');
    } catch {
      setErrorMessage('Erro ao carregar dados do restaurante.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(sanitized);
    setSlugError('');
    if (sanitized.length > 0 && sanitized.length < 3) {
      setSlugError('O slug deve ter pelo menos 3 caracteres.');
    }
  };

  const handleSave = async () => {
    if (!slug || slug.length < 3) {
      setSlugError('O slug deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      await api.put(`/tenants/${tenantId}`, {
        name,
        slug,
        primary_color: primaryColor,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
      });

      if (slug !== originalSlug) {
        setTenantSlug(slug);
        setOriginalSlug(slug);
      }

      setSuccessMessage('Personalizacao salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar personalizacao.';
      if (msg.toLowerCase().includes('slug')) {
        setSlugError('Este slug ja esta em uso. Escolha outro.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'banner',
  ) => {
    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingBanner;
    const setUrl = type === 'logo' ? setLogoUrl : setBannerUrl;

    setUploading(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUrl(data.url);
    } catch {
      setErrorMessage(`Erro ao enviar ${type === 'logo' ? 'logo' : 'banner'}. Tente novamente.`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const storeUrl = `http://localhost:5173/${slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personalizar Pagina</h1>
          <p className="text-gray-500 mt-1">Customize a aparencia da sua vitrine</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !!slugError}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Salvar Alteracoes
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMessage}
        </div>
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
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do restaurante
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Meu Restaurante"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Slug (URL do restaurante)
                </label>
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-4 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-500">
                    menufacil.com/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`flex-1 px-4 py-3 border rounded-r-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                      slugError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                    placeholder="meu-restaurante"
                  />
                </div>
                {slugError ? (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {slugError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">
                    URL: {storeUrl}
                  </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cor principal
                </label>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPrimaryColor(color)}
                      className={`w-full aspect-square rounded-xl border-2 transition-all hover:scale-105 ${
                        primaryColor === color
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
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-gray-300 cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="#FF6B35"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-gray-900">Imagens</h2>
              </div>
            </div>
            <div className="p-5 space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Logo
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'logo');
                    e.target.value = '';
                  }}
                />
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
                      </button>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remover logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Recomendado: 200x200px, formato PNG, JPG ou WebP (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Banner
                </label>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'banner');
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden mb-3 hover:border-primary hover:bg-primary-50/30 transition-colors cursor-pointer disabled:cursor-wait"
                >
                  {uploadingBanner ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-1 animate-spin" />
                      <p className="text-xs text-gray-400">Enviando banner...</p>
                    </div>
                  ) : bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt="Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-500 font-medium">Clique para enviar</p>
                      <p className="text-xs text-gray-400">1200 x 400px recomendado (max 5MB)</p>
                    </div>
                  )}
                </button>
                {bannerUrl && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Banner enviado
                    </p>
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remover
                    </button>
                  </div>
                )}
              </div>
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

                  {/* Content */}
                  <div className="bg-white">
                    {/* Banner */}
                    <div
                      className="h-28 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden"
                      style={
                        bannerUrl
                          ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}66)` }
                      }
                    >
                      {/* Logo overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 to-transparent">
                        <div className="flex items-center gap-2">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {name?.charAt(0)?.toUpperCase() || 'R'}
                            </div>
                          )}
                          <div>
                            <p className="text-white text-xs font-bold leading-tight drop-shadow">
                              {name || 'Meu Restaurante'}
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
                              ? { backgroundColor: primaryColor, color: 'white' }
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
                            <p
                              className="text-[10px] font-bold"
                              style={{ color: primaryColor }}
                            >
                              {product.price}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: primaryColor }}
                          >
                            +
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fake bottom bar */}
                    <div
                      className="mx-3 mb-3 py-2 rounded-xl text-center"
                      style={{ backgroundColor: primaryColor }}
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
