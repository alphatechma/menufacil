import { Link, useParams } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Star,
  ChevronRight,
  Bike,
  ArrowRight,
} from 'lucide-react';
import { useGetStorefrontProductsQuery, useGetStorefrontCategoriesQuery } from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';

export default function StoreFront() {
  const { slug } = useParams<{ slug: string }>();
  const tenant = useAppSelector((state) => state.tenant.tenant);

  const { data: products = [] } = useGetStorefrontProductsQuery(
    { slug: slug! },
    { skip: !slug },
  );
  const { data: categories = [] } = useGetStorefrontCategoriesQuery(
    { slug: slug! },
    { skip: !slug },
  );

  const featuredProducts = products.filter((p: any) => p.is_active).slice(0, 6);

  return (
    <div className="pb-6">
      {/* Banner */}
      <div className="relative">
        {tenant?.banner_url ? (
          <img
            src={tenant.banner_url}
            alt={tenant.name}
            className="w-full h-48 sm:h-56 object-cover"
          />
        ) : (
          <div
            className="w-full h-48 sm:h-56 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))`,
            }}
          >
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold mb-1">{tenant?.name}</h2>
              <p className="text-white/80 text-sm">
                {tenant?.description || 'Bem-vindo ao nosso cardapio!'}
              </p>
            </div>
          </div>
        )}

        {/* Info chips overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {tenant?.estimated_delivery_time && (
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {tenant.estimated_delivery_time}
              </span>
            )}
            {tenant?.delivery_fee !== undefined && (
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full">
                <Bike className="w-3.5 h-3.5" />
                {tenant.delivery_fee === 0
                  ? 'Entrega gratis'
                  : formatPrice(tenant.delivery_fee)}
              </span>
            )}
            {(tenant?.min_order_value ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full">
                Pedido min. {formatPrice(tenant!.min_order_value)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Store info bar */}
      {tenant?.address && (
        <div className="bg-white px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tenant.address}</span>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Categorias</h3>
            <Link
              to={`/${slug}/menu`}
              className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-primary)' }}
            >
              Ver todas
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {categories.map((category: any) => (
              <Link
                key={category.id}
                to={`/${slug}/menu?category=${category.id}`}
                className="flex-shrink-0 group"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 mb-2 ring-2 ring-transparent group-hover:ring-[var(--tenant-primary)] transition-all">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, var(--tenant-primary-light), var(--tenant-primary))`,
                      }}
                    >
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 text-center truncate w-24">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Destaques</h3>
            <Link
              to={`/${slug}/menu`}
              className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-primary)' }}
            >
              Ver cardapio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product: any) => (
              <Link
                key={product.id}
                to={`/${slug}/menu/${product.id}`}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white/80"
                      style={{
                        background: `linear-gradient(135deg, var(--tenant-primary-light), var(--tenant-primary))`,
                      }}
                    >
                      <span className="text-4xl">
                        {product.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <p
                    className="font-bold text-sm mt-2"
                    style={{ color: 'var(--tenant-primary)' }}
                  >
                    {product.variations && product.variations.length > 0
                      ? `A partir de ${formatPrice(
                          Math.min(
                            ...product.variations.map((v: any) => v.price),
                          ),
                        )}`
                      : formatPrice(product.base_price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {products.length === 0 && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--tenant-primary-light)' }}
          >
            <Star className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Em breve!
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            O cardapio esta sendo preparado. Volte em breve para conferir as
            deliciosas opcoes!
          </p>
        </div>
      )}
    </div>
  );
}
