import { useState } from 'react';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGetAdminReviewsQuery,
  useGetReviewStatsQuery,
  useReplyToReviewMutation,
} from '@/api/adminApi';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            iconSize,
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
          )}
        />
      ))}
    </div>
  );
}

export default function ReviewList() {
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: reviewsData, isLoading } = useGetAdminReviewsQuery({
    rating: filterRating,
  });
  const { data: stats, isLoading: loadingStats } = useGetReviewStatsQuery();
  const [replyToReview, { isLoading: replying }] = useReplyToReviewMutation();

  const reviews = reviewsData?.data || [];

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;

    try {
      await replyToReview({ id: reviewId, reply: replyText.trim() }).unwrap();
      toast.success('Resposta enviada!');
      setReplyText('');
      setExpandedId(null);
    } catch {
      toast.error('Erro ao enviar resposta');
    }
  };

  return (
    <div>
      <PageHeader
        title="Avaliacoes"
        description="Gerencie as avaliacoes dos seus clientes"
      />

      {/* Stats Bar */}
      {!loadingStats && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-500">Nota Media</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.average_rating}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_reviews}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">NPS</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              stats.nps_score >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {stats.nps_score}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-gray-500">Por estrela</span>
            </div>
            <div className="flex gap-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="text-center">
                  <p className="text-xs font-medium text-gray-900">
                    {stats.by_star[star]}
                  </p>
                  <p className="text-[10px] text-gray-400">{star}★</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterRating(undefined)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            !filterRating
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          Todas
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilterRating(star)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
              filterRating === star
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {star}
            <Star className="w-3 h-3 fill-current" />
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma avaliacao encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {review.customer_name}
                    </span>
                    <StarDisplay rating={review.rating} />
                    <span className="text-xs text-gray-400">
                      Pedido #{review.order_number}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setExpandedId(expandedId === review.id ? null : review.id)
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {expandedId === review.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Existing reply */}
              {review.reply && (
                <div className="mt-3 bg-primary-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-primary-dark mb-1">
                    Sua resposta
                  </p>
                  <p className="text-sm text-gray-700">{review.reply}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.replied_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {/* Reply form */}
              {expandedId === review.id && !review.reply && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva uma resposta..."
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReply(review.id);
                    }}
                  />
                  <button
                    onClick={() => handleReply(review.id)}
                    disabled={replying || !replyText.trim()}
                    className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-95"
                  >
                    {replying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
