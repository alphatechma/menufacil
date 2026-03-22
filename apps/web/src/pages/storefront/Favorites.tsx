import { Link, useParams } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { useGetStorefrontProductsQuery } from '@/api/customerApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectFavoriteIds, toggleFavorite } from '@/store/slices/favoritesSlice';
import { formatPrice } from '@/utils/formatPrice';

export default function Favorites() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(selectFavoriteIds);

  const { data: products = [] } = useGetStorefrontProductsQuery(
    { slug: slug! },
    { skip: !slug },
  );

  const favoriteProducts = products.filter((p: any) => favoriteIds.includes(p.id));

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          to={`/${slug}/menu`}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Favoritos</h1>
      </div>

      <div className="px-4 pt-4">
        {favoriteProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum favorito ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Toque no coracao nos produtos para salvar seus favoritos
            </p>
            <Link
              to={`/${slug}/menu`}
              className="inline-block mt-4 px-6 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: 'var(--tenant-gradient)' }}
            >
              Ver cardapio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteProducts.map((product: any) => {
              const hasVariations = product.variations && product.variations.length > 0;
              const minPrice = hasVariations
                ? Math.min(...product.variations.map((v: any) => v.price))
                : product.base_price;

              return (
                <Link
                  key={product.id}
                  to={`/${slug}/menu/${product.id}`}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex group hover:shadow-md transition-shadow relative"
                >
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-2">
                        <h4 className="font-semibold text-gray-900 mb-1 flex-1">
                          {product.name}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dispatch(toggleFavorite(product.id));
                          }}
                          className="shrink-0 p-1 -mt-0.5 -mr-1 rounded-full hover:bg-gray-100 transition-colors z-20 relative"
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <p
                        className="font-bold"
                        style={{ color: 'var(--tenant-primary)' }}
                      >
                        {hasVariations
                          ? `A partir de ${formatPrice(minPrice)}`
                          : formatPrice(minPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="w-28 h-28 flex-shrink-0 bg-gray-100 overflow-hidden">
                    {(product.image_url || product.category?.image_url) ? (
                      <img
                        src={product.image_url || product.category?.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl text-white/70"
                        style={{ background: 'var(--tenant-gradient)' }}
                      >
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
