import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useGetOrderTrackingQuery, useCreateReviewMutation, useCanReviewOrderQuery } from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/cn';
import { useNotify } from '@/hooks/useNotify';

export default function ReviewOrder() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const isAuthenticated = useAppSelector((s) => s.customerAuth.isAuthenticated);

  const { data: order, isLoading: loadingOrder } = useGetOrderTrackingQuery(
    { slug: slug!, orderId: orderId! },
    { skip: !slug || !orderId },
  );

  const { data: canReviewData, isLoading: loadingCanReview } = useCanReviewOrderQuery(
    { slug: slug!, orderId: orderId! },
    { skip: !slug || !orderId || !isAuthenticated },
  );

  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      notify.error('Selecione uma nota');
      return;
    }

    try {
      await createReview({
        slug: slug!,
        data: {
          orderId: orderId!,
          rating,
          comment: comment.trim() || undefined,
        },
      }).unwrap();

      setSubmitted(true);
      notify.success('Avaliação enviada com sucesso!');
    } catch (err: any) {
      const msg = err?.data?.message || 'Erro ao enviar avaliação';
      notify.error(msg);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <p className="text-gray-500">Faça login para avaliar seu pedido.</p>
        <button
          onClick={() => navigate(`/${slug}/account`)}
          className="mt-4 btn-primary px-6 py-2 rounded-xl"
        >
          Fazer login
        </button>
      </div>
    );
  }

  if (loadingOrder || loadingCanReview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
      </div>
    );
  }

  if (canReviewData && !canReviewData.can_review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Star className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-700 font-medium text-lg">
          {canReviewData.reason === 'Already reviewed'
            ? 'Voce ja avaliou este pedido!'
            : 'Este pedido ainda nao pode ser avaliado.'}
        </p>
        <button
          onClick={() => navigate(`/${slug}/account`)}
          className="mt-4 text-[var(--tenant-primary)] font-medium"
        >
          Voltar para minha conta
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Obrigado pela avaliação!</h2>
        <p className="text-gray-500 mb-6">Sua opiniao nos ajuda a melhorar.</p>
        <button
          onClick={() => navigate(`/${slug}/account`)}
          className="btn-primary px-6 py-2.5 rounded-xl"
        >
          Voltar para minha conta
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Avaliar Pedido</h1>
      </div>

      {/* Order summary */}
      {order && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Pedido #{order.order_number}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(order.total)}
            </span>
          </div>
          {order.items && (
            <p className="text-xs text-gray-500">
              {order.items.map((i: any) => i.product_name).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Star rating */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Como foi sua experiencia?
        </h2>
        <p className="text-sm text-gray-500 mb-6">Toque nas estrelas para avaliar</p>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={cn(
                  'w-10 h-10 transition-colors',
                  (hoverRating || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300',
                )}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-sm font-medium text-gray-700">
            {rating === 1 && 'Muito ruim'}
            {rating === 2 && 'Ruim'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bom'}
            {rating === 5 && 'Excelente!'}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Deixe um comentario (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi sua experiencia..."
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:border-transparent resize-none"
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition-all duration-200 active:scale-95',
          rating > 0
            ? 'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-dark)]'
            : 'bg-gray-300 cursor-not-allowed',
          submitting && 'opacity-70 cursor-wait',
        )}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        Enviar Avaliacao
      </button>
    </div>
  );
}
