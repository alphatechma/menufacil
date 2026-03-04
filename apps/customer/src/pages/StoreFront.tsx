import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Star,
  ChevronRight,
  Bike,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';
import { useTenantStore } from '../store/tenantStore';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types';

export function StoreFront() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, categories, products, fetchProducts } = useTenantStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const featuredProducts = products.filter((p) => p.is_active).slice(0, 6);

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
            {categories.map((category) => (
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
            {featuredProducts.map((product) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                slug={slug!}
                formatPrice={formatPrice}
              />
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

function FeaturedProductCard({
  product,
  slug,
  formatPrice,
}: {
  product: Product;
  slug: string;
  formatPrice: (price: number) => string;
}) {
  const { items, addItem, updateQuantity } = useCartStore();
  const isSimple = product.variations.length === 0 && product.extra_groups.length === 0;

  const cartIndex = isSimple
    ? items.findIndex(
        (item) =>
          item.product_id === product.id &&
          !item.variation_id &&
          item.extras.length === 0,
      )
    : -1;
  const cartQty = cartIndex >= 0 ? items[cartIndex].quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variation_id: null,
      variation_name: null,
      unit_price: product.base_price,
      quantity: 1,
      extras: [],
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartIndex >= 0) {
      updateQuantity(cartIndex, cartQty - 1);
    }
  };

  return (
    <Link
      to={`/${slug}/menu/${product.id}`}
      className="card group"
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

        {/* +/- button overlay */}
        {isSimple && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1"
            onClick={(e) => e.preventDefault()}
          >
            {cartQty > 0 ? (
              <div className="flex items-center gap-1 bg-white rounded-full shadow-lg px-1 py-0.5">
                <button
                  onClick={handleRemove}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: 'var(--tenant-primary)' }}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-gray-900">
                  {cartQty}
                </span>
                <button
                  onClick={handleAdd}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors"
                  style={{ backgroundColor: 'var(--tenant-primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
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
          {product.variations.length > 0
            ? `A partir de ${formatPrice(
                Math.min(
                  ...product.variations.map((v) => v.price),
                ),
              )}`
            : formatPrice(product.base_price)}
        </p>
      </div>
    </Link>
  );
}
